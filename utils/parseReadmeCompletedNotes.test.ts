import { describe, it, expect } from 'vitest'

import { parseReadmeCompletedNotes } from './parseReadmeCompletedNotes'

describe('parseReadmeCompletedNotes', () => {
  const REMOTE = 'https://github.com/owner/repo/notes'

  it('should count completed and total notes correctly', () => {
    const content = [
      `- [x] [0001. First note](${REMOTE}/0001.first-note/README) ✅`,
      `- [ ] [0002. Second note](${REMOTE}/0002.second-note/README) ❌`,
      `- [x] [0003. Third note](${REMOTE}/0003.third-note/README)`,
      `- [ ] [0004. Fourth note](${REMOTE}/0004.fourth-note/README)`,
    ].join('\n')

    const result = parseReadmeCompletedNotes(content)

    expect(result.totalCount).toBe(4)
    expect(result.completedCount).toBe(2)
  })

  it('should prioritize emoji over checkbox markers', () => {
    const content = [
      `- [ ] [0001. Note with x](${REMOTE}/0001.x/README) ❌`,
      `- [x] [0002. Note with check](${REMOTE}/0002.check/README) ✅`,
    ].join('\n')

    const result = parseReadmeCompletedNotes(content)

    expect(result.notes[0].completed).toBe(false)  // ❌ takes priority
    expect(result.notes[1].completed).toBe(true)   // ✅ takes priority
  })

  it('should deduplicate identical note indexes with same status', () => {
    const content = [
      `- [x] [0001. First note](${REMOTE}/0001.first/README) ✅`,
      `- [x] [0001. First note dup](${REMOTE}/0001.first/README)`,
    ].join('\n')

    const result = parseReadmeCompletedNotes(content)

    expect(result.totalCount).toBe(1)
  })

  it('should throw when same note index has conflicting statuses', () => {
    const content = [
      `- [x] [0001. First note](${REMOTE}/0001.first/README) ✅`,
      `- [ ] [0001. First note undone](${REMOTE}/0001.first/README)`,
    ].join('\n')

    expect(() => parseReadmeCompletedNotes(content)).toThrow(
      /相同编号.*不同的完成状态/,
    )
  })

  it('should ignore lines without note index', () => {
    const content = [
      '# Header',
      '',
      `- [x] [0001. First note](${REMOTE}/0001.first/README)`,
      'some random text without index',
      `- [ ] [0002. Second note](${REMOTE}/0002.second/README)`,
    ].join('\n')

    const result = parseReadmeCompletedNotes(content)

    expect(result.totalCount).toBe(2)
    expect(result.completedCount).toBe(1)
  })

  it('should handle empty content', () => {
    const result = parseReadmeCompletedNotes('')

    expect(result.totalCount).toBe(0)
    expect(result.completedCount).toBe(0)
  })

  it('should handle content with no matching lines', () => {
    const result = parseReadmeCompletedNotes('# Just a header\n\nSome text')

    expect(result.totalCount).toBe(0)
    expect(result.completedCount).toBe(0)
  })
})
