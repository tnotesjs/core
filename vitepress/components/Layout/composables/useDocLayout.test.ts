/**
 * useDocLayout.test.ts
 */

import { describe, expect, it } from 'vitest'

import { resolveResponsiveLayoutState } from './docLayoutLogic'

describe('resolveResponsiveLayoutState', () => {
  it('keeps three columns on wide viewport', () => {
    expect(
      resolveResponsiveLayoutState({
        viewportWidth: 1600,
        sidebarWidth: 260,
        userSidebarHidden: false,
        contentWidthMode: 'wide',
        hasAside: true,
      }),
    ).toEqual({ asideAutoHidden: false, sidebarAutoHidden: false })
  })

  it('hides aside first when viewport is medium', () => {
    expect(
      resolveResponsiveLayoutState({
        viewportWidth: 1300,
        sidebarWidth: 260,
        userSidebarHidden: false,
        contentWidthMode: 'standard',
        hasAside: true,
      }),
    ).toEqual({ asideAutoHidden: true, sidebarAutoHidden: false })
  })

  it('hides aside and sidebar when viewport is narrow', () => {
    expect(
      resolveResponsiveLayoutState({
        viewportWidth: 1000,
        sidebarWidth: 260,
        userSidebarHidden: false,
        contentWidthMode: 'standard',
        hasAside: true,
      }),
    ).toEqual({ asideAutoHidden: true, sidebarAutoHidden: true })
  })

  it('does not apply auto-collapse on mobile viewport', () => {
    expect(
      resolveResponsiveLayoutState({
        viewportWidth: 375,
        sidebarWidth: 260,
        userSidebarHidden: false,
        contentWidthMode: 'wide',
        hasAside: true,
      }),
    ).toEqual({ asideAutoHidden: false, sidebarAutoHidden: false })
  })

  it('does not reserve aside space when page has no outline on desktop', () => {
    expect(
      resolveResponsiveLayoutState({
        viewportWidth: 1000,
        sidebarWidth: 260,
        userSidebarHidden: false,
        contentWidthMode: 'standard',
        hasAside: false,
      }),
    ).toEqual({ asideAutoHidden: false, sidebarAutoHidden: true })
  })
})
