import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  const handleFileChange = (e:any) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setMessage('');
    setFileUrl('');

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        setMessage('File processed successfully!');
        setFileUrl(result.fileUrl);
      } else {
        setMessage('Error processing file.');
      }
    } catch (error) {
      setMessage('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
<div className="container  flex justify-center items-center h-screen flex-col  rounded-lg ">
  <h2 className="text-2xl font-semibold text-white mb-4">Upload CSV File</h2>
  <input
    type="file"
    accept=".csv"
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
  {fileUrl && (
    <p className="mt-4 text-sm text-blue-500">
      <a href={fileUrl} download className="hover:underline">
        Download Processed CSV
      </a>
    </p>
  )}
</div>

  );
}
