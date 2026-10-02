import test from "node:test"
import assert from "node:assert/strict"
import { runInNewContext } from "node:vm"
import script from "./scripts/novel-pagination"

function browser() {
  const listeners = new Map<string, Set<(event?: any) => void>>()
  const cleanup: (() => void)[] = []
  const clicked: string[] = []
  let editing = false
  let blocked = false
  let selected = false
  let previous = true
  let next = true
  const document = {
    addEventListener(type: string, fn: (event?: any) => void) {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type)!.add(fn)
    },
    removeEventListener(type: string, fn: (event?: any) => void) {
      listeners.get(type)?.delete(fn)
    },
    querySelector(selector: string) {
      if (selector.includes("search-container")) return blocked ? {} : null
      const direction = selector.includes("first-child") ? "previous" : "next"
      if (direction === "previous" ? !previous : !next) return null
      return { click: () => clicked.push(direction) }
    },
  }
  const window = {
    getSelection: () => ({ isCollapsed: !selected }),
    addCleanup: (fn: () => void) => cleanup.push(fn),
  }
  runInNewContext(script, { document, window })
  const nav = () => {
    cleanup.splice(0).forEach((fn) => fn())
    listeners.get("nav")!.forEach((fn) => fn())
  }
  nav()
  const press = (key: string, extra: object = {}) => {
    let prevented = false
    const event = {
      key,
      target: { closest: () => (editing ? {} : null) },
      preventDefault: () => {
        prevented = true
      },
      ...extra,
    }
    listeners.get("keydown")!.forEach((fn) => fn(event))
    return prevented
  }
  return {
    clicked,
    press,
    nav,
    editing: (value: boolean) => {
      editing = value
    },
    blocked: (value: boolean) => {
      blocked = value
    },
    selected: (value: boolean) => {
      selected = value
    },
    endpoints: (prev: boolean, following: boolean) => {
      previous = prev
      next = following
    },
  }
}

test("left/right arrows follow existing page links, without duplicating SPA listeners", () => {
  const page = browser()
  assert.equal(page.press("ArrowRight"), true)
  assert.equal(page.press("ArrowLeft"), true)
  page.nav()
  assert.equal(page.press("ArrowRight"), true)
  assert.deepEqual(page.clicked, ["next", "previous", "next"])
})

test("typing, search/dialogs and text selection never turn pages", () => {
  const page = browser()
  page.editing(true)
  assert.equal(page.press("ArrowRight"), false)
  page.editing(false)
  page.blocked(true)
  assert.equal(page.press("ArrowRight"), false)
  page.blocked(false)
  page.selected(true)
  assert.equal(page.press("ArrowLeft"), false)
  assert.deepEqual(page.clicked, [])
})

test("modifier keys, held keys and composition are left to the browser", () => {
  const page = browser()
  for (const flag of [
    "ctrlKey",
    "metaKey",
    "altKey",
    "shiftKey",
    "repeat",
    "isComposing",
    "defaultPrevented",
  ]) {
    assert.equal(page.press("ArrowRight", { [flag]: true }), false)
  }
  assert.equal(page.press("ArrowDown"), false)
  page.endpoints(false, false)
  assert.equal(page.press("ArrowLeft"), false)
  assert.equal(page.press("ArrowRight"), false)
  assert.deepEqual(page.clicked, [])
})
