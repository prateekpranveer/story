import React, { useState, useEffect, useCallback, useRef } from "react";
import { client } from "@/src/sanity/lib/client";

const fixedDocId = "novelContentDoc";
const totalGoal = 1000;

export default function LiveTextEditor() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const editorRef = useRef(null);

  // Load initial content
  useEffect(() => {
    async function fetchData() {
      const doc = await client.getDocument(fixedDocId);
      if (doc) {
        if (doc.content) {
          setContent(doc.content);
          editorRef.current.innerHTML = doc.content;
        }
        if (doc.title) {
          setTitle(doc.title);
        }
      }
    }
    fetchData();
  }, []);

  // Save to Sanity
  const saveToSanity = useCallback(
    debounce(async (htmlContent, newTitle) => {
      setSaving(true);
      try {
        await client
          .patch(fixedDocId)
          .set({ content: htmlContent, title: newTitle })
          .commit({ autoGenerateArrayKeys: true });
        setLastSaved(new Date().toLocaleTimeString());
      } catch (err) {
        console.error("Save error:", err);
      }
      setSaving(false);
    }, 800),
    []
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

  const format = (cmd, value = null) => {
    document.execCommand(cmd, false, value);
  };

  const createLink = () => {
    const url = prompt("Enter a URL (include https://):");
    if (url) document.execCommand("createLink", false, url);
  };

  // Add Bash block (wraps selected text in <pre><code>)
  const insertBashBlock = () => {
    document.execCommand("formatBlock", false, "pre"); // Turns into <pre>
    const sel = window.getSelection();
    if (sel.rangeCount) {
      const parent = sel.anchorNode.parentElement;
      parent.classList.add("bash-block");
    }
  };

  const wordCount = content
    ? content.replace(/<[^>]+>/g, "").trim().split(/\s+/).filter(Boolean).length
    : 0;

  const progress = Math.min((wordCount / totalGoal) * 100, 100);

  return (
    <div className={`flex min-h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-slate-100 text-black"} font-serif`}>
      {/* Sidebar Toolbar */}
      <div className={`sticky top-0 h-screen w-14 flex flex-col items-center gap-2 py-4 px-1 shadow-md z-10 ${darkMode ? "bg-gray-800" : "bg-white"}`}>
        <button onClick={() => format("bold")} className="sidebar-btn" title="Bold">B</button>
        <button onClick={() => format("italic")} className="sidebar-btn" title="Italic">I</button>
        <button onClick={() => format("underline")} className="sidebar-btn" title="Underline">U</button>
        <button onClick={() => format("insertUnorderedList")} className="sidebar-btn" title="Bullet List">•</button>
        <button onClick={() => format("insertOrderedList")} className="sidebar-btn" title="Numbered List">1.</button>
        <button onClick={createLink} className="sidebar-btn" title="Insert Link">🔗</button>
        <button onClick={() => format("formatBlock", "H1")} className="sidebar-btn" title="Heading 1">H1</button>
        <button onClick={() => format("formatBlock", "H2")} className="sidebar-btn" title="Heading 2">H2</button>
        <button onClick={() => format("formatBlock", "H3")} className="sidebar-btn" title="Heading 3">H3</button>
        <button onClick={() => format("formatBlock", "P")} className="sidebar-btn" title="Paragraph">¶</button>

        {/* New Bash/Code Block Button */}
        <button onClick={insertBashBlock} className="sidebar-btn" title="Insert Bash Block">💻</button>

        <button onClick={() => setDarkMode(!darkMode)} className="sidebar-btn mt-auto text-xs" title="Toggle Dark Mode">
          {darkMode ? "☀️" : "🌙"}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-grow w-full px-6 pt-6 pb-12 max-w-5xl mx-auto">
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
          className="min-h-[300px] text-lg leading-relaxed outline-none prose max-w-none
            [&_a]:text-blue-600 [&_a]:underline [&_a]:hover:underline [&_a]:hover:cursor-pointer
            [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4
            [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-3
            [&_h3]:text-xl [&_h3]:font-medium [&_h3]:mt-4 [&_h3]:mb-2
            [&_p]:mb-4
            [&_.bash-block]:bg-gray-800 [&_.bash-block]:text-green-400 [&_.bash-block]:font-mono [&_.bash-block]:p-3 [&_.bash-block]:rounded-lg"
          style={{ whiteSpace: "pre-wrap", wordWrap: "break-word", padding: "8px 0" }}
        ></div>

        <div className="mt-3 text-sm text-gray-500 dark:text-gray-300">
          {saving ? "Saving..." : lastSaved ? `✅ Saved at ${lastSaved}` : "Not saved yet"}
        </div>
      </div>

      {/* Footer Progress */}
      <div className={`fixed bottom-0 left-14 right-0 px-4 sm:px-6 lg:px-8 py-3 shadow-md ${darkMode ? "bg-gray-800" : "bg-white"}`}>
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
          <span>Word count: {wordCount}</span>
          <span>Goal: {totalGoal}</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-sky-800 transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

// Debounce helper
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
