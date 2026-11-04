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
  Smartphone,
  GraduationCap as ExamIcon,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { Button, Card, PageHeader } from '../../components/ui';

interface Shortcut {
  key: string;
  label: string;
  shortLabel?: string;
  hash: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const QUICK_SHORTCUTS: Shortcut[] = [
  { key: 'hub', label: 'Medical Hub', shortLabel: 'Y khoa', hash: '#/medical', icon: Stethoscope },
  { key: 'thyroid', label: 'Tuyến giáp', shortLabel: 'Giáp', hash: '#/medical/thyroid', icon: Stethoscope },
  { key: 'diabetes', label: 'Đái tháo đường', shortLabel: 'Tiểu đường', hash: '#/medical/diabetes', icon: Stethoscope },
  { key: 'ai-tutor', label: 'Phòng thi ảo AI', shortLabel: 'AI Tutor', hash: '#/ai-tutor', icon: Bot, badge: '1-on-1' },
  { key: 'vstep', label: 'VSTEP B1-C1', shortLabel: 'VSTEP', hash: '#/vstep', icon: BookOpen, badge: 'B1~C1' },
  { key: 'mock-exam', label: 'Thi thử VSTEP', shortLabel: 'Thi thử', hash: '#/mock-exam', icon: ExamIcon },
  { key: 'translator', label: 'Dịch thuật Y khoa', shortLabel: 'Dịch thuật', hash: '#/translator', icon: Languages },
  { key: 'dashboard', label: 'Toàn bộ Modules', shortLabel: 'Tất cả', hash: '#/', icon: Sparkles },
];

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

  const currentShortcut = QUICK_SHORTCUTS.find(s => s.key === activeTab) || QUICK_SHORTCUTS[0];

  // ==========================================
  // FULLSCREEN / DEDICATED APP MODE
  // ==========================================
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-canvas w-screen h-[100dvh] overflow-hidden">
        {/* Fullscreen Top App Bar */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-line bg-surface/95 px-3 backdrop-blur safe-top">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="xs"
              icon={ArrowLeft}
              onClick={() => setIsFullscreen(false)}
              className="font-medium"
            >
              <span className="hidden sm:inline">Thu nhỏ</span>
              <span className="sm:hidden">Thoát</span>
            </Button>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-fg">
              <span className="hidden xs:inline">🎓 Tiếng Anh Y khoa</span>
              <span className="text-muted">/</span>
              <span className="text-primary truncate max-w-[140px] sm:max-w-none">
                {currentShortcut.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="xs"
              icon={RotateCw}
              onClick={handleReload}
              title="Tải lại giao diện"
              iconOnly
            />
            <Button
              variant="ghost"
              size="xs"
              icon={ExternalLink}
              onClick={handleOpenNewTab}
              title="Mở trong tab riêng"
              iconOnly
            />
            <Button
              variant="primary"
              size="xs"
              icon={Minimize2}
              onClick={() => setIsFullscreen(false)}
              title="Thoát toàn màn hình"
            >
              <span className="hidden sm:inline">Thu nhỏ</span>
            </Button>
          </div>
        </header>

        {/* Swipeable Tabs Bar in Fullscreen */}
        <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-line bg-sunken/40 px-2 py-1.5 text-xs scrollbar-none">
          {QUICK_SHORTCUTS.map(sc => {
            const Icon = sc.icon;
            const isActive = activeTab === sc.key;
            return (
              <button
                key={sc.key}
                type="button"
                onClick={() => navigateIframe(sc.hash, sc.key)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-surface text-muted hover:bg-sunken hover:text-fg'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{sc.label}</span>
                {sc.badge && (
                  <span
                    className={`rounded px-1 py-0.2 text-[9px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-primary-soft text-primary'
                    }`}
                  >
                    {sc.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Fullscreen Iframe */}
        <div className="flex-1 w-full h-full min-h-0 bg-surface safe-bottom">
          <iframe
            ref={iframeRef}
            src="/study/index.html?embedded=1"
            title="English Master Medical Module Fullscreen"
            className="w-full h-full border-0"
            allow="microphone; camera; clipboard-write; autoplay"
          />
        </div>
      </div>
    );
  }

  // ==========================================
  // REGULAR IN-PAGE VIEW (RESPONSIVE)
  // ==========================================
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Desktop Page Header */}
      <div className="hidden sm:block">
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
                variant="primary"
                size="sm"
                icon={Maximize2}
                onClick={() => setIsFullscreen(true)}
                title="Mở toàn màn hình để học tập thuận tiện nhất"
              >
                Toàn màn hình
              </Button>
            </div>
          }
        />
      </div>

      {/* Mobile Streamlined Header */}
      <div className="flex sm:hidden items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <GraduationCap className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-fg leading-tight truncate">
              Tiếng Anh Y khoa
            </h1>
            <p className="text-[11px] text-muted truncate">
              VSTEP · APTIS · Ngoại khoa
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="secondary"
            size="xs"
            icon={RotateCw}
            onClick={handleReload}
            title="Làm mới"
            iconOnly
          />
          <Button
            variant="secondary"
            size="xs"
            icon={ExternalLink}
            onClick={handleOpenNewTab}
            title="Tab mới"
            iconOnly
          />
          <Button
            variant="primary"
            size="xs"
            icon={Maximize2}
            onClick={() => setIsFullscreen(true)}
            className="shadow-sm font-semibold"
          >
            Mở rộng
          </Button>
        </div>
      </div>

      {/* Mobile Fullscreen Recommendation Banner */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsFullscreen(true)}
        className="flex sm:hidden items-center justify-between p-2.5 rounded-xl border border-primary/20 bg-primary-soft/30 text-primary cursor-pointer active:scale-[0.99] transition-all"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Smartphone className="h-4 w-4 shrink-0" />
          <span className="text-xs font-semibold leading-tight truncate">
            Chế độ Toàn màn hình (tràn viền, dễ học hơn)
          </span>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 opacity-70" />
      </div>

      {/* Quick Navigation Scroll Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
        <span className="hidden sm:inline font-medium text-muted mr-1 shrink-0">Chuyển nhanh:</span>
        {QUICK_SHORTCUTS.map(sc => {
          const Icon = sc.icon;
          const isActive = activeTab === sc.key;
          return (
            <button
              key={sc.key}
              type="button"
              onClick={() => navigateIframe(sc.hash, sc.key)}
              className={`inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                isActive
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-card text-fg border-line hover:border-primary/40 hover:bg-primary-soft/10 active:scale-95'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">{sc.label}</span>
              <span className="xs:hidden">{sc.shortLabel || sc.label}</span>
              {sc.badge && (
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-primary-soft text-primary'
                  }`}
                >
                  {sc.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Iframe Card */}
      <Card
        className="overflow-hidden border border-line bg-card shadow-sm transition-all h-[calc(100dvh-14rem)] min-h-[460px] sm:min-h-[580px] p-0"
      >
        <iframe
          ref={iframeRef}
          src="/study/index.html?embedded=1"
          title="English Master Medical Module"
          className="w-full h-full border-0 block"
          allow="microphone; camera; clipboard-write; autoplay"
        />
      </Card>
    </div>
  );
};

export default MedicalEnglishPage;
