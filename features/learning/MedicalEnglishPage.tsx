import React, { useRef, useState } from 'react';
import {
  ExternalLink,
  GraduationCap,
  Maximize2,
  Minimize2,
  RotateCw,
  Sparkles,
  Stethoscope,
  Bot,
  BookOpen,
  Languages,
} from 'lucide-react';
import { Button, Card, PageHeader } from '../../components/ui';

export const MedicalEnglishPage: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('hub');

  const navigateIframe = (hash: string, tabKey: string) => {
    setActiveTab(tabKey);
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.location.hash = hash;
    }
  };

  const handleReload = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handleOpenNewTab = () => {
    const currentHash = iframeRef.current?.contentWindow?.location.hash || '#/';
    window.open(`/study/index.html${currentHash}`, '_blank', 'noopener,noreferrer');
  };

  const QUICK_SHORTCUTS = [
    { key: 'hub', label: 'Medical Hub', hash: '#/medical', icon: Stethoscope },
    { key: 'ai-tutor', label: 'Phòng thi ảo AI', hash: '#/ai-tutor', icon: Bot, badge: '1-on-1' },
    { key: 'vstep', label: 'VSTEP B1-C1', hash: '#/vstep', icon: BookOpen },
    { key: 'translator', label: 'Dịch thuật Y khoa', hash: '#/translator', icon: Languages },
    { key: 'dashboard', label: 'Toàn bộ Modules', hash: '#/', icon: Sparkles },
  ];

  return (
    <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-bg p-4 flex flex-col' : ''}`}>
      <PageHeader
        title="Tiếng Anh Y khoa & Đào tạo"
        description="Từ điển phẫu thuật, phòng thi ảo AI, luyện thi VSTEP / APTIS và công cụ dịch thuật chuyên ngành"
        icon={GraduationCap}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={RotateCw}
              onClick={handleReload}
              title="Tải lại giao diện học tập"
            >
              Làm mới
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={ExternalLink}
              onClick={handleOpenNewTab}
              title="Mở trong tab riêng biệt"
            >
              Mở tab mới
            </Button>
            <Button
              variant={isFullscreen ? 'primary' : 'secondary'}
              size="sm"
              icon={isFullscreen ? Minimize2 : Maximize2}
              onClick={() => setIsFullscreen(prev => !prev)}
              title={isFullscreen ? 'Thu nhỏ giao diện' : 'Mở toàn màn hình'}
            >
              {isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            </Button>
          </div>
        }
      />

      {/* Quick navigation bar */}
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="font-medium text-muted mr-1">Chuyển nhanh:</span>
        {QUICK_SHORTCUTS.map(sc => {
          const Icon = sc.icon;
          const isActive = activeTab === sc.key;
          return (
            <button
              key={sc.key}
              type="button"
              onClick={() => navigateIframe(sc.hash, sc.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                isActive
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-card text-fg border-line hover:border-primary/40 hover:bg-primary-soft/10'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{sc.label}</span>
              {sc.badge && (
                <span className={`text-[10px] px-1 py-0.2 rounded font-semibold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-primary-soft text-primary'
                }`}>
                  {sc.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Iframe container */}
      <Card
        className={`overflow-hidden border border-line bg-card shadow-sm transition-all ${
          isFullscreen ? 'flex-1 h-full min-h-0' : 'h-[calc(100vh-13.5rem)] min-h-[580px]'
        }`}
      >
        <iframe
          ref={iframeRef}
          src="/study/index.html"
          title="English Master Medical Module"
          className="w-full h-full border-0"
          allow="microphone; camera; clipboard-write"
        />
      </Card>
    </div>
  );
};

export default MedicalEnglishPage;
