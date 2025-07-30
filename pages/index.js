import React, { useState, useEffect, useCallback } from "react";
import { client } from "@/src/sanity/lib/client";

const fixedDocId = "novelContentDoc";
const totalGoal = 70000;

export default function LiveTextEditor() {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Load initial data
  useEffect(() => {
    async function fetchData() {
      const doc = await client.getDocument(fixedDocId);
      if (doc) {
        setContent(doc.content || "");
      }
    }
    fetchData();
  }, []);

  // Debounced save
  const saveToSanity = useCallback(
    debounce(async (newContent) => {
      setSaving(true);
      try {
        await client
          .patch(fixedDocId)
          .set({ content: newContent, title: "Story" }) // Always set title as "Story"
          .commit({ autoGenerateArrayKeys: true });
        setLastSaved(new Date().toLocaleTimeString());
      } catch (err) {
        console.error("Error saving:", err);
      }
      setSaving(false);
    }, 800),
    []
  );

  const handleContentChange = (e) => {
    setContent(e.target.value);
    saveToSanity(e.target.value);
  };

  // Word count & progress
  const wordCount = content.trim()
    ? content.trim().split(/\s+/).filter(Boolean).length
    : 0;

  const progress = Math.min((wordCount / totalGoal) * 100, 100);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="max-w-6xl min-w-2xl mx-auto py-8 px-4 flex-1">
        {/* Fixed Title */}
        <h1 className="w-full opacity-60 text-5xl mb-6 font-mediumBody font-light font-serif">
          Story
        </h1>

        {/* Content */}
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="Tell your story..."
          className="w-full font-serif text-xl font-mediumBody outline-none resize-none min-h-[300px] placeholder-gray-400 leading-relaxed"
        />

        {/* Status */}
        <div className="text-sm text-gray-500 mt-4 font-mediumUI">
          {saving
            ? "Saving..."
            : lastSaved
            ? `Saved at ${lastSaved}`
            : "Not saved yet"}
        </div>
      </div>

      {/* Bottom Sticky Word Counter + Progress Bar */}
      <div className="w-full font-serif bg-white px-4 py-3 text-sm font-mediumUI text-gray-600">
        <div className="flex justify-between mb-2">
          <span>Word count: {wordCount}</span>
          <span>Goal: {totalGoal}</span>
        </div>
        {/* Progress Bar */}
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500"
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
