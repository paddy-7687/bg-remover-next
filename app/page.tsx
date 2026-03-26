'use client';

import { useState, useCallback } from 'react';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string>('');
  const [resultUrl, setResultUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }
    setSelectedFile(file);
    setOriginalUrl(URL.createObjectURL(file));
    setResultUrl('');
    setError('');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleProcess = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError('');

    try {
      const form = new FormData();
      form.append('image', selectedFile);
      const res = await fetch('/api/remove-bg', { method: 'POST', body: form });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || '处理失败');
      }

      const blob = await res.blob();
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理失败');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setOriginalUrl('');
    setResultUrl('');
    setError('');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-2xl">
        {/* Header */}
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">✨ 图片去背景</h1>
        <p className="text-center text-gray-400 text-sm mb-8">一键去除图片背景，由 Remove.bg 提供支持</p>

        {/* Drop Zone */}
        {!selectedFile && (
          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center cursor-pointer transition-all hover:border-purple-400 hover:bg-purple-50"
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => document.getElementById('fileInput')?.click()}
          >
            <div className="text-5xl mb-3">🖼️</div>
            <p className="text-gray-600">拖拽图片到这里，或者<span className="text-purple-600 font-semibold">点击选择</span></p>
            <p className="text-gray-300 text-xs mt-2">支持 JPG、PNG、WebP，最大 12MB</p>
            <input
              id="fileInput"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
        )}

        {/* Preview */}
        {selectedFile && (
          <div className="grid grid-cols-2 gap-4 mt-6">
            {[{ label: '原图', url: originalUrl }, { label: '去背景后', url: resultUrl }].map(({ label, url }) => (
              <div key={label}>
                <div
                  className="rounded-xl overflow-hidden aspect-square flex items-center justify-center"
                  style={{ background: 'repeating-conic-gradient(#e0e0e0 0% 25%, white 0% 50%) 0 0 / 16px 16px' }}
                >
                  {url
                    ? <img src={url} alt={label} className="max-w-full max-h-full object-contain" />
                    : <span className="text-gray-300 text-sm">{loading && label === '去背景后' ? '处理中…' : '待处理'}</span>
                  }
                </div>
                <p className="text-xs text-gray-400 text-center mt-1">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && <p className="text-red-500 text-sm text-center mt-4">❌ {error}</p>}

        {/* Actions */}
        <div className="mt-6 space-y-3">
          {selectedFile && !resultUrl && (
            <button
              onClick={handleProcess}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-base hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  处理中…
                </>
              ) : '🚀 开始去背景'}
            </button>
          )}

          {resultUrl && (
            <a
              href={resultUrl}
              download="no-bg.png"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-400 text-white font-semibold text-base text-center block hover:opacity-90 transition-all"
            >
              ⬇️ 下载 PNG
            </a>
          )}

          {selectedFile && (
            <button onClick={reset} className="w-full text-gray-400 text-sm underline hover:text-gray-600 transition-colors">
              重新选择
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
