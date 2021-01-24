import db from '../db/connection'
import { generateToken } from '../utils/utils'
import { createHashtag, createUser, followUser } from './helpers'
import { testClient } from './setup'
import { TOGGLE_FOLLOW } from './queries/followers.queries'
import { ADD_TWEET } from './queries/tweets.queries'
import { ValidationError } from 'apollo-server'

describe('Hashtags', () => {
  beforeEach(async () => {
    await db.migrate.rollback()
    await db.migrate.latest()
  })

  afterEach(async () => {
    await db.migrate.rollback()
  })

  it('should insert hashtags when adding a tweet', async () => {
    const user = await createUser()

    const { mutate } = await testClient({
      req: {
        headers: {
          authorization: 'Bearer ' + generateToken(user),
        },
      },
    })

    const res = await mutate({
      mutation: ADD_TWEET,
      variables: {
        payload: {
          body: `Really nice Tweet

          @ipsaous
          
          https://machin.fr
          
          #machin #truc`,
          hashTags: ['#machin', '#truc'],
        },
      },
    })

    const hashtags = await db('hashtags').pluck('id')

    expect(hashtags.length).toEqual(2)

    const tweets_hashtags = await db('hashtags_tweets')
      .whereIn('hashtag_id', hashtags)
      .andWhere('tweet_id', res.data.addTweet.id)

    expect(tweets_hashtags.length).toEqual(2)
  })

  it('should not insert a hashtag if its already in the database', async () => {
    const user = await createUser()
    const hashTag = await createHashtag('#machin')

    const { mutate } = await testClient({
      req: {
        headers: {
          authorization: 'Bearer ' + generateToken(user),
        },
      },
    })

    const res = await mutate({
      mutation: ADD_TWEET,
      variables: {
        payload: {
          body: `Really nice Tweet

          @ipsaous
          
          https://machin.fr
          
          #machin #truc`,
          hashTags: ['#machin', '#truc'],
        },
      },
    })

    const hashtags = await db('hashtags')
      .whereIn('hashtag', ['#machin', '#truc'])
      .pluck('id')

    expect(hashtags.length).toEqual(2)

    const tweets_hashtags = await db('hashtags_tweets')
      .whereIn('hashtag_id', hashtags)
      .andWhere('tweet_id', res.data.addTweet.id)

    expect(tweets_hashtags.length).toEqual(2)
  })

  it('should not insert a duplicate hashtag', async () => {
    const user = await createUser()

    const { mutate } = await testClient({
      req: {
        headers: {
          authorization: 'Bearer ' + generateToken(user),
        },
      },
    })

    const res = await mutate({
      mutation: ADD_TWEET,
      variables: {
        payload: {
          body: `Really nice Tweet

          @ipsaous
          
          https://machin.fr
          
          #machin #truc`,
          hashTags: ['#machin', '#truc', '#machin'],
        },
      },
    })

    const hashtags = await db('hashtags')
      .whereIn('hashtag', ['#machin', '#truc', '#machin'])
      .pluck('id')

    expect(hashtags.length).toEqual(2)

    const tweets_hashtags = await db('hashtags_tweets')
      .whereIn('hashtag_id', hashtags)
      .andWhere('tweet_id', res.data.addTweet.id)

    expect(tweets_hashtags.length).toEqual(2)
  })

  it('should not insert invalid hashtag', async () => {
    const user = await createUser()

    const { mutate } = await testClient({
      req: {
        headers: {
          authorization: 'Bearer ' + generateToken(user),
        },
      },
    })

    const res = await mutate({
      mutation: ADD_TWEET,
      variables: {
        payload: {
          body: `Really nice Tweet

          @ipsaous
          
          https://machin.fr
          
          #machin #truc`,
          hashTags: ['machin', '#truc'],
        },
      },
    })

    expect(res.errors).not.toBeUndefined()

    const {
      extensions: {
        exception: { validationErrors },
      },
    }: any = res.errors![0]

    expect((validationErrors[0] as ValidationError).constraints).toEqual({
      matches:
        'Each hashtag should start with a # and have a length betweet 2 and 20 characters',
    })
  })
})
