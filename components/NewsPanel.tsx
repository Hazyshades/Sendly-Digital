import { useState, useMemo } from 'react';
import { Bell, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { cn } from './ui/utils';

interface NewsItem {
  id: string;
  title: string;
  description: string;
  date: string;
  type?: 'update' | 'feature' | 'announcement' | 'fixed';
}

// Example news data - can be replaced with real data from API
const newsItems: NewsItem[] = [
  {
    id: '2',
    title: 'Synchronization completed',
    description: 'All data in the leaderboard has been synchronized on block 20804073. Next synchronization will be done each 1000 blocks.',
    date: '1/9/2026',
    type: 'update',
  }
];

export function NewsPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Filter news by type
  const filteredNews = useMemo(() => {
    if (filterType === 'all') {
      return newsItems;
    }
    return newsItems.filter(item => item.type === filterType);
  }, [filterType]);

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'feature':
        return 'text-blue-600 bg-blue-50';
      case 'update':
        return 'text-purple-600 bg-purple-50';
      case 'announcement':
        return 'text-green-600 bg-green-50';
      case 'fixed':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case 'feature':
        return 'New';
      case 'update':
        return 'Update';
      case 'announcement':
        return 'Announcement';
      case 'fixed':
        return 'Fixed';
      default:
        return 'News';
    }
  };

  return (
    <div
      className={cn(
        'fixed left-2 bottom-2 md:left-4 md:bottom-4 z-50 transition-all duration-300 ease-in-out',
        isExpanded ? 'w-[calc(100vw-1rem)] md:w-96 max-w-md' : 'w-14 md:w-16'
      )}
    >
      <Card
        className={cn(
          'bg-white/95 backdrop-blur-sm shadow-circle-card border-gray-200 overflow-hidden transition-all duration-300',
          isExpanded ? 'h-[400px] md:h-[500px] max-h-[calc(100vh-2rem)]' : 'h-14 md:h-16'
        )}
      >
        {!isExpanded ? (
          <button
            onClick={toggleExpand}
            className="w-full h-full flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Open news"
          >
            <div className="relative">
              <Bell className="w-6 h-6 text-blue-600" />
              {newsItems.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {newsItems.length}
                </span>
              )}
            </div>
          </button>
        ) : (
          <>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-lg font-semibold">News and updates</CardTitle>
                {newsItems.length > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {newsItems.length}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleExpand}
                className="h-8 w-8"
                aria-label="Collapse news"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 h-[calc(100%-73px)] flex flex-col overflow-hidden">
              <Tabs value={filterType} onValueChange={setFilterType} className="w-full flex flex-col flex-1 min-h-0">
                <TabsList className="grid w-full grid-cols-3 mb-4 flex-shrink-0">
                  <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                  <TabsTrigger value="announcement" className="text-xs">Announcements</TabsTrigger>
                      <TabsTrigger value="update" className="text-xs">Updates</TabsTrigger>
                </TabsList>
                <ScrollArea className="flex-1 min-h-0">
                  <div className="space-y-3 pr-4">
                    {filteredNews.map((item, index) => (
                      <div key={item.id}>
                        <div
                          className="p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-white/50"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span
                              className={cn(
                                'text-xs font-semibold px-2 py-1 rounded-lg',
                                getTypeColor(item.type)
                              )}
                            >
                              {getTypeLabel(item.type)}
                            </span>
                            <span className="text-xs text-gray-500">{item.date}</span>
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                          <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                        </div>
                        {index < filteredNews.length - 1 && (
                          <Separator className="my-3" />
                        )}
                      </div>
                    ))}
                  </div>
                  {filteredNews.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No updates in this category</p>
                    </div>
                  )}
                </ScrollArea>
              </Tabs>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}