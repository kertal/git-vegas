import React, { useState, useEffect } from 'react';
import { 
  getStorageStats, 
  getStorageInfo, 
  clearAllGitHubData,
  StorageInfo 
} from '../utils/storageUtils';
import { eventsStorage } from '../utils/indexedDB';

interface StorageManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onClearEvents?: () => void;
  onClearSearchItems?: () => void;
}

export const StorageManager: React.FC<StorageManagerProps> = ({ 
  isOpen, 
  onClose, 
  onClearEvents, 
  onClearSearchItems 
}) => {
  const [storageInfo, setStorageInfo] = useState<StorageInfo[]>([]);
  const [stats, setStats] = useState(getStorageStats());
  const [indexedDBInfo, setIndexedDBInfo] = useState<{ eventsCount: number; metadataCount: number; totalSize: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStorageInfo(getStorageInfo());
      setStats(getStorageStats());
      
      // Get IndexedDB info
      eventsStorage.getInfo().then(info => {
        setIndexedDBInfo(info);
      }).catch(() => {
        setIndexedDBInfo(null);
      });
    }
  }, [isOpen]);

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all GitHub data? This action cannot be undone.')) {
      clearAllGitHubData();
      eventsStorage.clear().catch(console.error);
      onClearEvents?.();
      onClearSearchItems?.();
      setStorageInfo(getStorageInfo());
      setStats(getStorageStats());
      setIndexedDBInfo(null);
    }
  };

  const handleClearEvents = () => {
    if (window.confirm('Are you sure you want to clear all events data? This action cannot be undone.')) {
      eventsStorage.clear().catch(console.error);
      onClearEvents?.();
      setIndexedDBInfo(null);
    }
  };

  const handleClearSearchItems = () => {
    if (window.confirm('Are you sure you want to clear all search items data? This action cannot be undone.')) {
      onClearSearchItems?.();
    }
  };

  const handleClearItem = (key: string) => {
    if (window.confirm(`Are you sure you want to clear "${key}"?`)) {
      localStorage.removeItem(key);
      setStorageInfo(getStorageInfo());
      setStats(getStorageStats());
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Storage Manager</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Storage Statistics */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Storage Usage</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Used:</span>
              <span className="ml-2 font-mono">{formatBytes(stats.totalSize)}</span>
            </div>
            <div>
              <span className="text-gray-600">Available:</span>
              <span className="ml-2 font-mono">{formatBytes(stats.availableSpace)}</span>
            </div>
            <div>
              <span className="text-gray-600">Usage:</span>
              <span className={`ml-2 font-mono ${stats.isNearLimit ? 'text-red-600' : ''}`}>
                {stats.usagePercent.toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-gray-600">Limit:</span>
              <span className="ml-2 font-mono">{formatBytes(stats.maxSize)}</span>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${stats.isNearLimit ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(stats.usagePercent, 100)}%` }}
              ></div>
            </div>
            {stats.isNearLimit && (
              <p className="text-red-600 text-sm mt-1">
                ⚠️ Storage is nearly full. Consider clearing old data.
              </p>
            )}
          </div>

          {/* IndexedDB Info */}
          {indexedDBInfo && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="font-semibold mb-2">IndexedDB Storage</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Events:</span>
                  <span className="ml-2 font-mono">{indexedDBInfo.eventsCount}</span>
                </div>
                <div>
                  <span className="text-gray-600">Metadata:</span>
                  <span className="ml-2 font-mono">{indexedDBInfo.metadataCount}</span>
                </div>
                <div>
                  <span className="text-gray-600">Size:</span>
                  <span className="ml-2 font-mono">{formatBytes(indexedDBInfo.totalSize)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Storage Items */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Stored Data</h3>
            <div className="flex gap-2">
              <button
                onClick={handleClearEvents}
                className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600"
              >
                Clear Events
              </button>
              <button
                onClick={handleClearSearchItems}
                className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
              >
                Clear Search Items
              </button>
              <button
                onClick={handleClearAll}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
              >
                Clear All
              </button>
            </div>
          </div>
          
          {storageInfo.length === 0 && !indexedDBInfo?.eventsCount ? (
            <p className="text-gray-500 text-center py-4">No data stored</p>
          ) : (
            <div className="space-y-2">
              {storageInfo.map((item) => (
                <div 
                  key={item.key}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded border"
                >
                  <div className="flex-1">
                    <div className="font-mono text-sm">{item.key}</div>
                    <div className="text-xs text-gray-500">{formatBytes(item.size)}</div>
                  </div>
                  <button
                    onClick={() => handleClearItem(item.key)}
                    className="ml-2 px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                  >
                    Clear
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
          <p className="mb-2"><strong>About Storage:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Events and search items are stored in IndexedDB for better performance and larger capacity</li>
            <li>Other settings use localStorage (limited to ~5MB)</li>
            <li>Old data is automatically cleared when space is needed</li>
            <li>You can manually clear data to free up space</li>
          </ul>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}; 