import { useState } from 'react';

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  /**
   * Handle file input change.
   * @param {React.ChangeEvent<HTMLInputElement>} e - Input event.
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files)); // Store multiple files
    }
  };

  const handleUpload = async () => {
    if (files.length < 1) {
      setMessage('Please select at least 2 files.');
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append('file', file)); // Append all files

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process files');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'processed_data.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      setMessage('File processed successfully!');
    } catch (error) {
      setMessage('Something went wrong.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex justify-center items-center h-screen flex-col rounded-lg">
      <h2 className="text-2xl font-semibold text-white mb-4">Upload CSV / Excel Files</h2>
      <input
        type="file"
        accept=".csv, .xls, .xlsx"
        multiple
        onChange={handleFileChange}
        className="mb-4 px-4 py-2 border border-gray-600 rounded-md text-white bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={handleUpload}
        disabled={loading}
        className={`px-6 py-3 rounded-md font-medium text-white ${
          loading ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
        } transition duration-300`}
      >
        {loading ? 'Processing...' : 'Upload & Process'}
      </button>
      {message && <p className="mt-4 text-sm text-gray-300">{message}</p>}
    </div>
  );
}
