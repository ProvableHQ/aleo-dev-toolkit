import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { History, Clock, FileText, Trash2, TrendingUp, Search, Calendar, Filter } from 'lucide-react';
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
          <CardTitle className="flex items-center space-x-2">
            <History className="h-5 w-5" />
            <span>Recent Searches</span>
          </CardTitle>
          <CardDescription>
            Your search history will appear here after you find records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No searches yet</p>
            <p className="text-sm mt-1">Start by searching for a program above</p>
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
            <CardTitle className="flex items-center space-x-2">
              <History className="h-5 w-5" />
              <span>Recent Searches</span>
            </CardTitle>
            <CardDescription>
              Track your record search performance and history
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={clearHistory}>
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{totalSearches}</div>
            <div className="text-sm text-blue-600">Total Searches</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{totalRecords}</div>
            <div className="text-sm text-green-600">Records Found</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{formatDuration(averageDuration)}</div>
            <div className="text-sm text-purple-600">Avg Time</div>
          </div>
        </div>

        {/* Search History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Search History</h3>
            {searchHistory.length > 5 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? 'Show Less' : `Show All (${searchHistory.length})`}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {displayedSearches.map((search) => (
              <div key={search.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="font-medium text-sm">{search.program}</div>
                    <div className="text-xs text-gray-500 flex items-center space-x-2">
                      <span>{formatTime(search.timestamp)}</span>
                      {search.walletType && (
                        <>
                          <span>•</span>
                          <span>{search.walletType}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Badge 
                    variant={search.recordsFound > 0 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {search.recordsFound} records
                  </Badge>
                  <div className="flex items-center space-x-1 text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span className="text-xs">{formatDuration(search.duration)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Insights */}
        {totalSearches >= 3 && (
          <div className="p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-center space-x-2 text-yellow-800 mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium text-sm">Quick Insights</span>
            </div>
            <div className="text-sm text-yellow-700 space-y-1">
              {averageDuration < 500 && (
                <p>• Your searches are performing well with fast response times</p>
              )}
              {totalRecords === 0 && totalSearches > 2 && (
                <p>• No records found yet - try searching for programs you've interacted with</p>
              )}
              {totalRecords > 0 && (
                <p>• Found an average of {Math.round(totalRecords / totalSearches)} records per search</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 