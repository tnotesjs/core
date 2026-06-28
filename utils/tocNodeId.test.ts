/**
 * utils/tocNodeId.test.ts
 */

import { describe, expect, it } from 'vitest'

import {
  computeSidebarNodeId,
  enrichSidebarNodeIds,
  nodeIdForNote,
  parseNodeId,
} from './tocNodeId'

import type { SidebarNodeLike } from './tocNodeId'

describe('tocNodeId', () => {
  it('computes note nodeId', () => {
    expect(
      computeSidebarNodeId({
        text: '✅ 0019. Author',
        link: '/notes/0019. Author/README',
        tocLineIndex: 0,
      }),
    ).toBe(nodeIdForNote('0019'))
  })

  it('computes folder nodeId from tocLineIndex', () => {
    expect(
      computeSidebarNodeId({
        text: 'build',
        folderPath: ['build'],
        tocLineIndex: 12,
      }),
    ).toBe('line:12')
  })

  it('enriches tree recursively', () => {
    const tree = enrichSidebarNodeIds<SidebarNodeLike>([
      {
        text: 'Parent',
        link: '/notes/0019. Author/README',
        tocLineIndex: 0,
        items: [{ text: 'Child', link: '/notes/0039. new/README', tocLineIndex: 1 }],
      },
    ])
    expect(tree[0].nodeId).toBe('note:0019')
    expect(tree[0].items?.[0].nodeId).toBe('note:0039')
  })

  it('parses nodeId kinds', () => {
    expect(parseNodeId('note:0019')).toEqual({
      kind: 'note',
      noteIndex: '0019',
    })
    expect(parseNodeId('line:34')).toEqual({
      kind: 'line',
      tocLineIndex: 34,
    })
  })
})
