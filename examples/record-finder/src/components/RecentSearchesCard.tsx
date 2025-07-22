import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { History, Clock, FileText, Trash2, TrendingUp, Search, Calendar, Filter, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface SearchMetric {
  id: string;
  timestamp: Date;
  program: string;
  recordsFound: number;
  duration: number;
  walletType?: string;
}

export function RecentSearchesCard() {
  const [searchHistory, setSearchHistory] = useState<SearchMetric[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    // Listen for new search events
    const handleSearchComplete = (event: CustomEvent) => {
      const searchData = {
        ...event.detail,
        timestamp: new Date(event.detail.timestamp)
      };
      
      setSearchHistory(prev => [searchData, ...prev].slice(0, 50)); // Keep last 50 searches
    };

    window.addEventListener('recordSearchComplete', handleSearchComplete as EventListener);
    
    return () => {
      window.removeEventListener('recordSearchComplete', handleSearchComplete as EventListener);
    };
  }, []);

  const clearHistory = () => {
    setSearchHistory([]);
    toast.success('Search history cleared');
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Calculate summary stats
  const totalSearches = searchHistory.length;
  const totalRecords = searchHistory.reduce((sum, search) => sum + search.recordsFound, 0);
  const averageDuration = totalSearches > 0 
    ? Math.round(searchHistory.reduce((sum, search) => sum + search.duration, 0) / totalSearches)
    : 0;

  const displayedSearches = showAll ? searchHistory : searchHistory.slice(0, 5);

  if (searchHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            <span>Recent Searches</span>
          </CardTitle>
          <CardDescription>
            Your search history will appear here after you find records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full mb-4">
              <Search className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No searches yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Start by searching for a program above
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-blue-600 dark:text-blue-400">
              <Sparkles className="h-4 w-4" />
              <span>Your search history will appear here</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-600" />
              <span>Recent Searches</span>
            </CardTitle>
            <CardDescription>
              Your search activity and performance metrics
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">{totalSearches}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Searches</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">{totalRecords}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Records</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">{formatDuration(averageDuration)}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Avg Time</div>
          </div>
        </div>

        {/* Search History */}
        <div className="space-y-2">
          {displayedSearches.map((search) => (
            <div
              key={search.id}
              className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-sm text-gray-900 dark:text-white">
                    {search.program}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {search.recordsFound} records
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatTime(search.timestamp)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>{formatDuration(search.duration)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Show More/Less */}
        {searchHistory.length > 5 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="w-full"
          >
            {showAll ? 'Show Less' : `Show ${searchHistory.length - 5} More`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
} 