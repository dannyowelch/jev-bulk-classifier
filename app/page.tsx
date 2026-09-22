"use client";

import { useState, useEffect } from "react";

interface Row {
  id: string;
  text: string;
  label?: string;
  confidence?: number;
  elapsedMs?: number;
}

interface ClassificationConfig {
  instructions: string;
  criteria: Record<string, string>;
}

const DEFAULT_SAMPLES: Row[] = [
  { id: "1", text: "I was charged twice for my subscription this month. Can you refund the duplicate charge?" },
  { id: "2", text: "The API returns 500 errors when I try to authenticate with OAuth. Is there an outage?" },
  { id: "3", text: "What's the difference between the Pro and Enterprise plans?" },
  { id: "4", text: "I need to cancel my account and delete all my data immediately." },
  { id: "5", text: "Your invoice shows a charge for 10 users but we only have 8. Please correct this." },
  { id: "6", text: "Integration with Slack stopped working after yesterday's deployment. Getting timeouts." },
  { id: "7", text: "Do you offer volume discounts for teams larger than 50?" },
  { id: "8", text: "I can't log in anymore. It says my account is suspended but I never got an email." },
  { id: "9", text: "The webhook payload format changed and broke our parser. Where's the changelog?" },
  { id: "10", text: "We're interested in the annual plan. What's the pricing?" },
  { id: "11", text: "Why am I being billed in euros when I signed up with USD?" },
  { id: "12", text: "Can I change the primary account owner to someone else on my team?" },
];

const DEFAULT_CONFIG: ClassificationConfig = {
  instructions: "Identify the customer's main complaint category",
  criteria: {
    billing: "Payments, invoices, and refunds",
    technical: "Errors, outages, and integrations",
    sales: "Pricing and upgrades",
    account: "Cancellations and account administration",
  },
};

export default function Home() {
  const [rows, setRows] = useState<Row[]>(DEFAULT_SAMPLES);
  const [config, setConfig] = useState<ClassificationConfig>(DEFAULT_CONFIG);
  const [apiKey, setApiKey] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalElapsedMs, setTotalElapsedMs] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("typesafe_api_key");
    if (stored) setApiKey(stored);
  }, []);

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    localStorage.setItem("typesafe_api_key", value);
  };

  const handleTextChange = (id: string, text: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, text } : r))
    );
  };

  const handleAddRow = () => {
    const newId = String(Date.now());
    setRows((prev) => [...prev, { id: newId, text: "" }]);
  };

  const handleDeleteRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleCriteriaChange = (key: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      criteria: { ...prev.criteria, [key]: value },
    }));
  };

  const handleAddCriterion = () => {
    const newKey = `label${Object.keys(config.criteria).length + 1}`;
    setConfig((prev) => ({
      ...prev,
      criteria: { ...prev.criteria, [newKey]: "" },
    }));
  };

  const handleDeleteCriterion = (key: string) => {
    setConfig((prev) => {
      const newCriteria = { ...prev.criteria };
      delete newCriteria[key];
      return { ...prev, criteria: newCriteria };
    });
  };

  const classifyAll = async () => {
    setRunning(true);
    setProgress(0);
    setTotalElapsedMs(null);

    const startTime = Date.now();
    const concurrency = 6;
    const results: Row[] = [...rows];

    for (let i = 0; i < results.length; i++) {
      results[i] = { ...results[i], label: undefined, confidence: undefined, elapsedMs: undefined };
    }
    setRows(results);

    const chunks: number[][] = [];
    for (let i = 0; i < results.length; i += concurrency) {
      chunks.push(Array.from({ length: Math.min(concurrency, results.length - i) }, (_, j) => i + j));
    }

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (i) => {
          try {
            const response = await fetch("/api/classify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                state: results[i].text,
                instructions: config.instructions,
                criteria: config.criteria,
                apiKey,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              results[i] = {
                ...results[i],
                label: data.label,
                confidence: data.confidence,
                elapsedMs: data.elapsedMs,
              };
            } else {
              const error = await response.json();
              results[i] = {
                ...results[i],
                label: "error",
                confidence: 0,
                elapsedMs: 0,
              };
              console.error(`Row ${i} error:`, error);
            }
          } catch (error) {
            results[i] = {
              ...results[i],
              label: "error",
              confidence: 0,
              elapsedMs: 0,
            };
            console.error(`Row ${i} exception:`, error);
          }

          setRows([...results]);
          setProgress(results.filter((r) => r.label !== undefined).length);
        })
      );
    }

    const endTime = Date.now();
    setTotalElapsedMs(endTime - startTime);
    setRunning(false);
  };

  const rowsPerSec = totalElapsedMs ? (rows.length / (totalElapsedMs / 1000)).toFixed(2) : null;

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Jev Bulk Classifier</h1>
        <p className="text-gray-600">
          Bulk text classification powered by TypeSafe Jev. Inspired by{" "}
          <a
            href="https://motherduck.com/blog/motherduck-supports-jev/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            MotherDuck&apos;s prompt_jev()
          </a>
          .
        </p>
      </header>

      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <label className="block text-sm font-medium mb-2">TypeSafe API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => handleApiKeyChange(e.target.value)}
          placeholder="ts_..."
          className="w-full px-3 py-2 border rounded-md"
        />
        <p className="text-xs text-gray-500 mt-1">
          Stored in localStorage. Server fallback: TYPESAFE_API_KEY env var.
        </p>
      </div>

      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-3">Classification Config</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Instructions</label>
          <input
            type="text"
            value={config.instructions}
            onChange={(e) => setConfig({ ...config, instructions: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Labels</label>
          {Object.entries(config.criteria).map(([key, desc]) => (
            <div key={key} className="flex gap-2 mb-2">
              <input
                type="text"
                value={key}
                onChange={(e) => {
                  const newKey = e.target.value;
                  if (newKey && newKey !== key) {
                    const newCriteria = { ...config.criteria };
                    delete newCriteria[key];
                    newCriteria[newKey] = desc;
                    setConfig({ ...config, criteria: newCriteria });
                  }
                }}
                className="w-40 px-3 py-2 border rounded-md"
                placeholder="key"
              />
              <input
                type="text"
                value={desc}
                onChange={(e) => handleCriteriaChange(key, e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md"
                placeholder="description"
              />
              <button
                onClick={() => handleDeleteCriterion(key)}
                className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
              >
                Delete
              </button>
            </div>
          ))}
          <button
            onClick={handleAddCriterion}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Add Label
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Text Rows</h2>
          <button
            onClick={handleAddRow}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Add Row
          </button>
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium">#</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Text</th>
                <th className="px-4 py-2 text-left text-sm font-medium w-32">Label</th>
                <th className="px-4 py-2 text-left text-sm font-medium w-24">Conf %</th>
                <th className="px-4 py-2 text-left text-sm font-medium w-20">ms</th>
                <th className="px-4 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                  <td className="px-4 py-2">
                    <textarea
                      value={row.text}
                      onChange={(e) => handleTextChange(row.id, e.target.value)}
                      className="w-full px-2 py-1 border rounded text-sm resize-y"
                      rows={2}
                    />
                  </td>
                  <td className="px-4 py-2 text-sm">{row.label || ""}</td>
                  <td className="px-4 py-2 text-sm">
                    {row.confidence !== undefined ? (row.confidence * 100).toFixed(1) : ""}
                  </td>
                  <td className="px-4 py-2 text-sm">{row.elapsedMs || ""}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleDeleteRow(row.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={classifyAll}
          disabled={running || rows.length === 0 || !apiKey}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {running ? `Classifying... ${progress}/${rows.length}` : "Classify All"}
        </button>
        {totalElapsedMs !== null && (
          <div className="text-sm text-gray-600">
            Total: {totalElapsedMs}ms ({rowsPerSec} rows/sec)
          </div>
        )}
      </div>
    </div>
  );
}
