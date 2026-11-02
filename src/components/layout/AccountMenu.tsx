import { useState, useRef, useEffect } from 'react';
import {
  User as UserIcon,
  Cloud,
  RefreshCw,
  Download,
  Upload,
  LogOut,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore.ts';
import { useCollectionStore } from '../../store/collectionStore.ts';
import { useDeckStore } from '../../store/deckStore.ts';

function formatLastSynced(timestamp: number | null): string {
  if (!timestamp) return 'ยังไม่เคยซิงค์';
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'เมื่อสักครู่';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const d = new Date(timestamp);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} น.`;
}

export function AccountMenu() {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const authError = useAuthStore((s) => s.error);
  const signIn = useAuthStore((s) => s.signIn);
  const signOut = useAuthStore((s) => s.signOut);

  const syncStatus = useCollectionStore((s) => s.syncStatus);
  const lastSyncedAt = useCollectionStore((s) => s.lastSyncedAt);
  const forceSyncCloud = useCollectionStore((s) => s.forceSyncCloud);
  const exportCollectionJSON = useCollectionStore((s) => s.exportCollectionJSON);
  const importCollectionJSON = useCollectionStore((s) => s.importCollectionJSON);
  const forceSyncDecksCloud = useDeckStore((s) => s.forceSyncDecksCloud);

  const [isOpen, setIsOpen] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupJsonText, setBackupJsonText] = useState('');
  const [backupFeedback, setBackupFeedback] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  async function handleManualSync() {
    if (!user) return;
    setSyncNotice('กำลังซิงค์...');
    const okCol = await forceSyncCloud(user.uid);
    const okDecks = await forceSyncDecksCloud(user.uid);
    setSyncNotice(okCol && okDecks ? 'ซิงค์ข้อมูลสำเร็จ ✓' : 'ซิงค์ไม่สำเร็จ');
    setTimeout(() => setSyncNotice(null), 2500);
  }

  function handleOpenBackup() {
    setBackupJsonText(exportCollectionJSON());
    setBackupFeedback(null);
    setShowBackupModal(true);
    setIsOpen(false);
  }

  function handleCopyBackup() {
    navigator.clipboard.writeText(backupJsonText);
    setBackupFeedback('คัดลอก JSON ลงคลิปบอร์ดแล้ว ✓');
    setTimeout(() => setBackupFeedback(null), 2000);
  }

  function handleImportBackup() {
    const res = importCollectionJSON(backupJsonText);
    setBackupFeedback(res.message);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        data-testid="btn-account-menu"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#121522] hover:bg-[#1a1f33] border border-slate-800 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
        title={user ? `บัญชี: ${user.displayName || user.email}` : 'เข้าสู่ระบบ / สำรองข้อมูล Cloud'}
      >
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || 'User'}
            className="w-5 h-5 rounded-full object-cover border border-rose-500/60"
            referrerPolicy="no-referrer"
          />
        ) : (
          <UserIcon className="w-4 h-4 text-rose-400" />
        )}

        <span className="hidden sm:inline max-w-[110px] truncate">
          {user ? user.displayName || user.email?.split('@')[0] : 'เข้าสู่ระบบ'}
        </span>

        {/* Sync Status Dot */}
        <span
          className={`w-2 h-2 rounded-full ${
            !user
              ? 'bg-slate-600'
              : syncStatus === 'syncing'
              ? 'bg-amber-400 animate-pulse'
              : syncStatus === 'error'
              ? 'bg-rose-500'
              : 'bg-emerald-400'
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          data-testid="account-menu-dropdown"
          className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#121626] border border-slate-700/90 shadow-2xl p-3 z-50 space-y-2.5"
        >
          {user ? (
            <>
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-800">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-9 h-9 rounded-full object-cover border border-rose-500/50"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-rose-600/30 border border-rose-500/40 flex items-center justify-center text-rose-300 font-bold">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-extrabold text-white truncate">
                    {user.displayName || 'ผู้เล่นตลิ่งชัน'}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                  <div className="text-[10px] text-emerald-400 font-medium mt-0.5">
                    ☁️ ซิงค์ล่าสุด: {formatLastSynced(lastSyncedAt)}
                  </div>
                </div>
              </div>

              {syncNotice && (
                <div className="text-[11px] px-2.5 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold text-center">
                  {syncNotice}
                </div>
              )}

              <button
                type="button"
                data-testid="btn-sync-cloud-now"
                onClick={handleManualSync}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-800/80 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                  ซิงค์ข้อมูล Cloud ตอนนี้
                </span>
                <span className="text-[10px] text-slate-400">Firestore</span>
              </button>

              <button
                type="button"
                data-testid="btn-open-collection-backup"
                onClick={handleOpenBackup}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-800/80 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-cyan-400" />
                  สำรอง / กู้คืนข้อมูล (JSON)
                </span>
              </button>

              <div className="border-t border-slate-800 pt-1.5">
                <button
                  type="button"
                  data-testid="btn-sign-out"
                  onClick={async () => {
                    await signOut();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-rose-950/60 text-xs font-bold text-rose-400 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  ออกจากระบบ
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5 pb-2 border-b border-slate-800">
                <Cloud className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-extrabold text-white">
                    ซิงค์ข้อมูลข้ามอุปกรณ์ (Cloud Sync)
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                    เข้าสู่ระบบด้วย Google เพื่อสำรองสมุดสะสมการ์ดและเด็คของคุณไว้บน Cloud อัตโนมัติ
                  </p>
                </div>
              </div>

              {authError && (
                <div className="flex items-start gap-1.5 text-[11px] text-rose-300 bg-rose-950/60 border border-rose-500/40 rounded-lg px-2.5 py-2 leading-relaxed">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span className="break-words">{authError}</span>
                </div>
              )}

              <button
                type="button"
                data-testid="btn-google-sign-in"
                disabled={authLoading}
                onClick={async () => {
                  const signedInUser = await signIn();
                  if (signedInUser) setIsOpen(false);
                }}
                className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-rose-950/50 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🔐 เข้าสู่ระบบด้วย Google</span>
              </button>

              <button
                type="button"
                data-testid="btn-open-collection-backup"
                onClick={handleOpenBackup}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                สำรอง / กู้คืนไฟล์ JSON
              </button>
            </div>
          )}
        </div>
      )}

      {/* Backup JSON Modal */}
      {showBackupModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowBackupModal(false)}
        >
          <div
            className="bg-[#121522] border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            data-testid="collection-backup-modal"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white">
                สำรองและกู้คืนข้อมูลสมุดสะสม (JSON Backup)
              </h3>
              <button
                onClick={() => setShowBackupModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              value={backupJsonText}
              onChange={(e) => setBackupJsonText(e.target.value)}
              rows={8}
              className="w-full bg-[#0b0d16] border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"
            />

            {backupFeedback && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 rounded-xl px-3 py-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{backupFeedback}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCopyBackup}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> คัดลอก JSON
              </button>
              <button
                type="button"
                onClick={handleImportBackup}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" /> นำเข้าข้อมูล (Import)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

