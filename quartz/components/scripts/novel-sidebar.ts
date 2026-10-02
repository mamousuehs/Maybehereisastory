// Export as a resource string so importing the server-rendered navigation in
// tests never evaluates browser globals.
export default `
function syncNovelSidebar() {
  const hidden = document.documentElement.dataset.novelNav === "hidden"
  const button = document.querySelector(".novel-sidebar-toggle")
  if (!button) return
  const label = hidden ? "显示导航" : "隐藏导航"
  button.setAttribute("aria-expanded", String(!hidden))
  button.setAttribute("aria-label", label)
  button.title = label
  const text = button.querySelector("span")
  if (text) text.textContent = label
}

document.addEventListener("nav", () => {
  syncNovelSidebar()
  const button = document.querySelector(".novel-sidebar-toggle")
  const toggle = () => {
    const hidden = document.documentElement.dataset.novelNav !== "hidden"
    document.documentElement.dataset.novelNav = hidden ? "hidden" : "visible"
    try {
      localStorage.setItem("novel-sidebar-hidden", String(hidden))
    } catch {}
    syncNovelSidebar()
  }
  button?.addEventListener("click", toggle)
  window.addCleanup(() => button?.removeEventListener("click", toggle))
})
`
