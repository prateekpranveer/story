import React, { useState, useEffect, useCallback, useRef } from "react";
import { client } from "@/src/sanity/lib/client";

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

  useEffect(() => {
    async function fetchArticles() {
      const result = await client.fetch(
        `*[_type == "novelContent"]{_id, title, content}`
      );
      setArticles(result);
      if (result.length > 0) setSelectedId(result[0]._id);
    }
    fetchArticles();
  }, []);

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

  const format = (cmd, value = null) => document.execCommand(cmd, false, value);

  const createLink = () => {
    const url = prompt("Enter a URL (include https://):");
    if (url) document.execCommand("createLink", false, url);
  };

  const insertBashBlock = () => {
    document.execCommand("formatBlock", false, "pre");
    const sel = window.getSelection();
    if (sel.rangeCount) {
      const parent = sel.anchorNode.parentElement;
      parent.classList.add("bash-block");
    }
  };

  const createNewArticle = async () => {
    const doc = await client.create({
      _type: "novelContent",
      title: "Untitled",
      content: "",
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
      className={`flex min-h-screen transition-all duration-500 ease-in-out ${darkMode ? "bg-gray-900 text-white" : "bg-slate-100 text-black"} font-serif`}
    >
      <button
        onClick={() => setShowArticlesSidebar(!showArticlesSidebar)}
        className="absolute top-2 right-2 z-50 bg-gray-300 dark:bg-gray-700 text-xs px-2 py-1 rounded shadow transition-transform duration-300 hover:scale-110"
      >
        {showArticlesSidebar ? "▶" : "More Articles"}
      </button>

      <div
        className={`sticky top-0 h-screen w-14 flex flex-col items-center gap-2 py-4 px-1 shadow-md z-10 transition-all duration-500 ease-in-out ${darkMode ? "bg-gray-800" : "bg-white"}`}
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
          { label: "💻", action: insertBashBlock },
        ].map(({ label, cmd, action, value }) => (
          <button
            key={label}
            onClick={() => (action ? action() : format(cmd, value))}
            className="sidebar-btn"
            title={label}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="sidebar-btn mt-auto text-xs"
          title="Toggle Dark Mode"
        >
          {darkMode ? "☀️" : "🌙"}
        </button>
      </div>

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
          className="min-h-[300px] text-lg leading-relaxed outline-none prose max-w-none font-serif [&_a]:text-blue-600 [&_a]:underline [&_a]:hover:underline [&_a]:hover:cursor-pointer [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-medium [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:mb-4 [&_.bash-block]:bg-gray-800 [&_.bash-block]:text-green-400 [&_.bash-block]:font-mono [&_.bash-block]:p-3 [&_.bash-block]:rounded-lg"
          style={{ whiteSpace: "pre-wrap", wordWrap: "break-word", padding: "8px 0" }}
        ></div>
        <div className="mt-3 text-sm text-gray-500 dark:text-gray-300">
          {saving ? "Saving..." : lastSaved ? `✅ Saved at ${lastSaved}` : "Not saved yet"}
        </div>
      </div>

      <div
        className={`transition-all duration-500 px-4 py-4 ease-in-out ${showArticlesSidebar ? "w-80 opacity-100" : "w-0 opacity-0 pointer-events-none"} overflow-hidden border-l px-3 py-4 ${darkMode ? "bg-gray-800" : "bg-white"}`}
      >
        <h2 className="font-bold text-lg mb-3">Articles</h2>
        <button
          onClick={createNewArticle}
          className="mb-3 bg-white border w-full rounded-sm py-3 text-blue-600 hover:underline cursor-pointer"
        >
          + Add New Article
        </button>
        <div className="mt-4">
          {articles.map((a) => {
            const wordCount = a.content
              ? a.content.replace(/<[^>]+>/g, "").trim().split(/\s+/).filter(Boolean).length
              : 0;
            const reachedGoal = wordCount >= totalGoal;
            return (
              <div
                key={a._id}
                onClick={() => setSelectedId(a._id)}
                className={`cursor-pointer px-2 py-2 font-mono rounded hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedId === a._id ? "bg-gray-100 dark:bg-gray-700 font-semibold" : ""} ${reachedGoal ? "text-green-600" : "text-red-600"}`}
              >
                {a.title || "Untitled"}
              </div>
            );
          })}
        </div>
      </div>

      <div className={`fixed bottom-0 left-14 right-0 px-4 py-3 shadow-md transition-all duration-500 ${darkMode ? "bg-gray-800" : "bg-white"}`}>
        <div className={`max-w-5xl mx-auto pr-${showArticlesSidebar ? "64" : "4"} transition-all duration-500`}>
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
            <span>Word count: {wordCount}</span>
            <span>Goal: {totalGoal}</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-800 transition-all duration-300 ease-in-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}