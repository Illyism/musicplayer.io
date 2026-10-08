import { expect, test } from 'bun:test'
import { trackDisplay } from './track-display'

test('community metadata is removed while artist and track names stay intact', () => {
  expect(
    trackDisplay({ title: 'The Parlor - Orange and Yellows [Psychedelic Rock] (2026)' })
  ).toEqual({ artist: 'The Parlor', title: 'Orange and Yellows' })
  expect(trackDisplay({ title: 'Bertolf -- Don’t Wanna Lose You Yet [Pop] (2009)' })).toEqual({
    artist: 'Bertolf',
    title: 'Don’t Wanna Lose You Yet',
  })
})

test('ordinary hyphenated words and unformatted titles remain readable', () => {
  expect(trackDisplay({ title: 'Post-rock is alive' })).toEqual({
    artist: null,
    title: 'Post-rock is alive',
  })
  expect(trackDisplay({ title: 'From the Start (live at home)' })).toEqual({
    artist: null,
    title: 'From the Start (live at home)',
  })
})
