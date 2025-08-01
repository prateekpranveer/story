import React, { useState, useEffect, useCallback, useRef } from "react";
import { client } from "@/src/sanity/lib/client";
import { AddIcon } from "@sanity/icons";

const totalGoal = 1000;

export default function LiveTextEditor() {
  const [articles, setArticles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [showArticlesSidebar, setShowArticlesSidebar] = useState(true);

  const editorRef = useRef(null);

  // Fetch articles from Sanity
  useEffect(() => {
    async function fetchArticles() {
      const result = await client.fetch(
        `*[_type == "novelContent"]{_id, title, content, completed}`
      );
      setArticles(result);
      if (result.length > 0) setSelectedId(result[0]._id);
    }
    fetchArticles();
  }, []);

  // Fetch selected content
  useEffect(() => {
    async function fetchContent() {
      if (!selectedId) return;
      const doc = await client.getDocument(selectedId);
      setTitle(doc.title || "");
      setContent(doc.content || "");
      if (editorRef.current) editorRef.current.innerHTML = doc.content || "";
    }
    fetchContent();
  }, [selectedId]);

  // Save changes to Sanity with debounce
  const saveToSanity = useCallback(
    debounce(async (htmlContent, newTitle) => {
      if (!selectedId) return;
      setSaving(true);
      try {
        await client
          .patch(selectedId)
          .set({ content: htmlContent, title: newTitle })
          .commit({ autoGenerateArrayKeys: true });
        setLastSaved(new Date().toLocaleTimeString());
      } catch (err) {
        console.error("Save error:", err);
      }
      setSaving(false);
    }, 800),
    [selectedId]
  );

  const handleInput = () => {
    const html = editorRef.current.innerHTML;
    setContent(html);
    saveToSanity(html, title);
  };

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    saveToSanity(content, newTitle);
  };

  // Toggle completed
  const toggleCompleted = async (id, currentStatus) => {
    try {
      await client.patch(id).set({ completed: !currentStatus }).commit();
      setArticles((prev) =>
        prev.map((a) =>
          a._id === id ? { ...a, completed: !currentStatus } : a
        )
      );
    } catch (error) {
      console.error("Error updating completed status:", error);
    }
  };

  // Format function for toolbar commands
  const format = (cmd, value = null) => {
    if (cmd === "insertUnorderedList" || cmd === "insertOrderedList") {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;

      const range = selection.getRangeAt(0);

      const boldEl = range.startContainer.parentElement.closest(
        "b, strong, span[style*='background-color']"
      );
      if (boldEl) {
        if (!boldEl.closest("li")) {
          const li = document.createElement("li");
          boldEl.parentNode.insertBefore(li, boldEl);
          li.appendChild(boldEl);
        }
      }
      document.execCommand(cmd, false, value);
    } else {
      document.execCommand(cmd, false, value);
    }
  };

  // Handle backspace in lists
  const handleKeyDown = (e) => {
    if (e.key === "Backspace") {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      const container = selection.anchorNode.parentElement;

      const li = container.closest("li");
      if (li && li.textContent.trim() === "") {
        e.preventDefault();
        if (li.parentNode.childElementCount === 1) {
          document.execCommand("outdent");
        } else {
          li.remove();
        }
      }
    }
  };

  // Insert link
  const createLink = () => {
    const url = prompt("Enter a URL (include https://):");
    if (url) document.execCommand("createLink", false, url);
  };

  // Insert Bash block
  const insertBashBlock = () => {
    document.execCommand("formatBlock", false, "pre");
    const sel = window.getSelection();
    if (sel.rangeCount) {
      const parent = sel.anchorNode.parentElement;
      parent.classList.add("bash-block");
    }
  };

  // Highlight text
  const highlightText = (color) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const parent = selection.anchorNode.parentElement;
    const currentColor = parent ? parent.style.backgroundColor : "";

    if (currentColor === color) {
      document.execCommand("removeFormat");
    } else {
      document.execCommand("backColor", false, color);
    }
  };

  // Create new article
  const createNewArticle = async () => {
    const doc = await client.create({
      _type: "novelContent",
      title: "Untitled",
      content: "",
      completed: false,
    });
    setArticles((prev) => [...prev, doc]);
    setSelectedId(doc._id);
  };

  const wordCount = content
    ? content
        .replace(/<[^>]+>/g, "")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length
    : 0;
  const progress = Math.min((wordCount / totalGoal) * 100, 100);

  return (
    <div
      className={`flex min-h-screen transition-all duration-500 ease-in-out ${
        darkMode ? "bg-slate-900 text-white" : "bg-slate-100 text-black"
      }`}
    >
      {/* Toggle Article Sidebar */}
      <button
        onClick={() => setShowArticlesSidebar(!showArticlesSidebar)}
        className="absolute top-2 right-2 z-50 bg-gray-300 dark:bg-gray-700 text-xs px-2 py-1 rounded shadow transition-transform duration-300 hover:scale-110"
      >
        {showArticlesSidebar ? "▶" : <AddIcon fontSize={32} />}
      </button>

      {/* Toolbar */}
      <div
        className={`sticky top-0 font-serif h-screen w-10 flex flex-col items-center gap-2 py-4 px-1 shadow-md z-10 transition-all duration-500 ease-in-out ${
          darkMode ? "bg-gray-800" : "bg-white"
        }`}
      >
        {[
          { label: "B", cmd: "bold" },
          { label: "I", cmd: "italic" },
          { label: "U", cmd: "underline" },
          { label: "•", cmd: "insertUnorderedList" },
          { label: "1.", cmd: "insertOrderedList" },
          { label: "🔗", action: createLink },
          { label: "H1", cmd: "formatBlock", value: "H1" },
          { label: "H2", cmd: "formatBlock", value: "H2" },
          { label: "H3", cmd: "formatBlock", value: "H3" },
          { label: "¶", cmd: "formatBlock", value: "P" },
          { label: "<>", action: insertBashBlock },
        ].map(({ label, cmd, action, value }) => (
          <button
            key={label}
            onClick={() => (action ? action() : format(cmd, value))}
            className=""
            title={label}
          >
            {label}
          </button>
        ))}

        {/* Highlight Colors */}
        <div className="flex flex-col gap-1 mt-2">
          {["#fcd34d", "#fda271ff", "#60a5fa", "#60e759ff","#00000000"].map((color) => (
            <button
              key={color}
              onClick={() => highlightText(color)}
              className="w-6 h-6 rounded-full border border-gray-600"
              style={{ backgroundColor: color }}
              title={`Highlight ${color}`}
            ></button>
          ))}
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-grow w-full px-6 pt-12 pb-12 max-w-5xl mx-auto transition-opacity duration-500 ease-in-out">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Enter title..."
          className="w-full text-3xl font-light font-serif bg-transparent mb-4 outline-none"
        />
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className="min-h-[300px] text-[16px] leading-relaxed outline-none prose max-w-none font-serif 
                     [&_ul]:list-disc [&_ul]:pl-6 
                     [&_ol]:list-decimal [&_ol]:pl-6 
                     [&_li]:mb-1
                     [&_a]:text-blue-600 [&_a]:underline [&_a]:hover:underline [&_a]:hover:cursor-pointer 
                     [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4 
                     [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-3 
                     [&_h3]:text-xl [&_h3]:font-medium [&_h3]:mt-4 [&_h3]:mb-2 
                     [&_p]:mb-4 
                     [&_.bash-block]:bg-gray-800 [&_.bash-block]:text-green-400 [&_.bash-block]:font-mono [&_.bash-block]:p-3 [&_.bash-block]:rounded-lg"
          style={{ whiteSpace: "pre-wrap", wordWrap: "break-word", padding: "8px 0" }}
        ></div>
      </div>

      {/* Article Sidebar */}
      <div
        className={`transition-all duration-500 px-4 py-4 ease-in-out ${
          showArticlesSidebar ? "w-80 opacity-100" : "w-0 opacity-0 pointer-events-none"
        } overflow-hidden border-l px-3 py-4 ${darkMode ? "bg-gray-800" : "bg-white"}`}
      >
        <h2 className="font-bold text-lg mb-3">Articles</h2>
        <button
          onClick={createNewArticle}
          className="mb-3 bg-white border w-full rounded-sm py-3 text-blue-600 hover:underline cursor-pointer"
        >
          Add Article
        </button>
        <div className="mt-4">
          {articles.map((a) => {
            const wordCount = a.content
              ? a.content
                  .replace(/<[^>]+>/g, "")
                  .trim()
                  .split(/\s+/)
                  .filter(Boolean).length
              : 0;
            const reachedGoal = wordCount >= totalGoal;
            return (
              <div
                key={a._id}
                className={`flex items-center justify-between px-2 py-2 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  selectedId === a._id
                    ? "bg-gray-100 dark:bg-gray-700 font-semibold"
                    : ""
                }`}
              >
                <span
                  onClick={() => setSelectedId(a._id)}
                  className={`${
                    reachedGoal ? "text-green-600" : "text-red-600"
                  } ${a.completed ? "line-through text-gray-400" : ""}`}
                >
                  {a.title || "Untitled"}
                </span>
                <button
                  onClick={() => toggleCompleted(a._id, a.completed)}
                  className={`text-xs px-2 py-1 rounded ${
                    a.completed
                      ? "bg-green-500 text-white"
                      : "bg-gray-300 text-black"
                  }`}
                >
                  {a.completed ? "✓" : "○"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Word count tracker + Saving Status */}
      <div
        className={`fixed z-100 bottom-0 left-0 right-0 px-6 py-2 shadow-lg transition-all duration-500 ${
          darkMode ? "bg-gray-900" : "bg-white"
        }`}
      >
        <div className="w-full mx-auto flex flex-col gap-2">
          <div className="w-full h-[6px] bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-800 transition-all duration-300 ease-in-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[12px] text-gray-600 dark:text-gray-300">
            <div className="flex gap-8">
              <span>Word count: {wordCount}</span>
              <span>Goal: {totalGoal}</span>
            </div>
            <div className="text-right flex gap-4">
              <div>
                {saving ? (
                  <span className="text-gray-500 font-medium">Saving...</span>
                ) : lastSaved ? (
                  <span className="text-green-700 font-medium">
                    ✅ Saved at {lastSaved}
                  </span>
                ) : (
                  <span className="text-gray-400">Not saved yet</span>
                )}
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="mt-auto text-xs border rounded-md cursor-pointer"
                title="Toggle Dark Mode"
              >
                {darkMode ? "☀️" : "🌙"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Debounce helper function
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
