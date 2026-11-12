import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Bot,
  KeyRound,
  Copy,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore.ts';
import { useCollectionStore } from '../../store/collectionStore.ts';
import { useDeckStore } from '../../store/deckStore.ts';
import {
  createMcpToken,
  listUserMcpTokens,
  revokeMcpToken,
  deleteMcpToken,
  reconcileUserMcpTokens,
} from '../../services/mcpTokenService.ts';
import type { McpTokenRecord, McpTokenScope } from '../../types/mcp.ts';

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

  // MCP Server Modal state
  const [showMcpModal, setShowMcpModal] = useState(false);
  const [mcpTokens, setMcpTokens] = useState<McpTokenRecord[]>([]);
  const [tokenLabel, setTokenLabel] = useState('Claude / Cursor AI');
  const [tokenScope, setTokenScope] = useState<McpTokenScope>('read_write');
  const [tokenExpiryDays, setTokenExpiryDays] = useState<number | null>(30);
  const [newlyCreatedRawToken, setNewlyCreatedRawToken] = useState<string | null>(null);
  const [mcpFeedback, setMcpFeedback] = useState<string | null>(null);
  const [mcpBusy, setMcpBusy] = useState(false);

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
    await reconcileUserMcpTokens(user.uid);
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

  async function handleOpenMcpModal() {
    setIsOpen(false);
    setNewlyCreatedRawToken(null);
    setMcpFeedback(null);
    setShowMcpModal(true);
    const list = await listUserMcpTokens(user?.uid);
    setMcpTokens(list);
  }

  async function handleGenerateMcpToken() {
    setMcpBusy(true);
    setMcpFeedback(null);
    try {
      const { rawToken } = await createMcpToken({
        label: tokenLabel,
        scope: tokenScope,
        expiresInDays: tokenExpiryDays,
      });
      setNewlyCreatedRawToken(rawToken);
      const list = await listUserMcpTokens(user?.uid);
      setMcpTokens(list);
      setMcpFeedback('สร้าง MCP Token สำเร็จ! กรุณาคัดลอกเก็บไว้ทันที (แสดงเพียงครั้งเดียว)');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถสร้าง Token ได้';
      setMcpFeedback(msg);
    } finally {
      setMcpBusy(false);
    }
  }

  async function handleRevokeToken(tokenHash: string) {
    await revokeMcpToken(tokenHash);
    const list = await listUserMcpTokens(user?.uid);
    setMcpTokens(list);
    setMcpFeedback('เพิกถอนสิทธิ์ Token เรียบร้อยแล้ว ✓');
  }

  async function handleDeleteTokenRecord(tokenHash: string) {
    await deleteMcpToken(tokenHash);
    const list = await listUserMcpTokens(user?.uid);
    setMcpTokens(list);
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

  const mcpEndpointUrl =
    typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? `${window.location.origin}/mcp`
      : 'https://talingchan.tcgcount.com/mcp';

  const sampleMcpConfigJson = JSON.stringify(
    {
      mcpServers: {
        talingchan: {
          type: 'http',
          url: mcpEndpointUrl,
          headers: {
            Authorization: `Bearer ${newlyCreatedRawToken || 'tct_mcp_วาง_TOKEN_ของคุณตรงนี้'}`,
          },
        },
      },
    },
    null,
    2
  );

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
                data-testid="btn-open-mcp-modal"
                onClick={handleOpenMcpModal}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-800/80 text-xs font-bold text-amber-300 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-amber-400" />
                  เชื่อมต่อ AI (MCP Server)
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ใหม่
                </span>
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
                data-testid="btn-open-mcp-modal"
                onClick={handleOpenMcpModal}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-amber-950/50 hover:bg-amber-900/50 border border-amber-500/30 text-xs font-bold text-amber-300 transition-colors cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5 text-amber-400" />
                เชื่อมต่อ AI (MCP Server)
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

      {/* MCP Server Configuration & Scoped Token Modal (rendered via Portal to escape header backdrop-filter) */}
      {showMcpModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setShowMcpModal(false)}
          >
            <div
              className="bg-[#121522] border border-slate-700/90 rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto my-auto font-['Prompt',sans-serif] text-slate-100"
              onClick={(e) => e.stopPropagation()}
              data-testid="mcp-server-modal"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">
                      เชื่อมต่อ AI ผ่าน Remote MCP Server
                    </h3>
                    <p className="text-xs text-slate-400">
                      เชื่อม Claude Desktop, Cursor, Antigravity หรือ AI Agent เข้ากับฐานข้อมูลการ์ดและเด็คของคุณอย่างปลอดภัย
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMcpModal(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Security Guardrails Notice */}
              <div className="bg-emerald-950/35 border border-emerald-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1 leading-relaxed">
                  <div className="font-bold text-emerald-300">
                    ระบบความปลอดภัย 5 ชั้น (Non-Destructive AI Guardrails):
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-emerald-200/90 space-y-0.5">
                    <li>เก็บเฉพาะค่าเข้ารหัสทางเดียว (SHA-256 Hash) และเพิกถอนสิทธิ์ (Revoke) ได้ทันที</li>
                    <li>
                      <strong>ห้ามลบข้อมูล:</strong> AI ไม่สามารถลบเด็คเดิม หรือลด/ล้างจำนวนการ์ดในคลังของคุณได้เด็ดขาด
                    </li>
                    <li>ค้นหาการ์ด กฎ และที่มามีมทั้ง 2,014 ใบได้ทันทีแม้ไม่ใส่ Token (Public Read)</li>
                  </ul>
                </div>
              </div>

              {/* Token Generator Section */}
              <div className="bg-[#181c2e] border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>สร้าง Personal Access Token สำหรับเชื่อมคลังการ์ดและจัดเด็ค</span>
                </div>

                {!user && (
                  <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-500/30 rounded-lg p-2.5">
                    💡 แนะนำให้ <strong>เข้าสู่ระบบด้วย Google</strong> ก่อนสร้าง Token เพื่อให้ AI ซิงค์คลังการ์ดและเด็คของคุณข้ามอุปกรณ์ผ่าน Cloud ได้
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">ชื่อเรียกอุปกรณ์/AI</label>
                    <input
                      type="text"
                      value={tokenLabel}
                      onChange={(e) => setTokenLabel(e.target.value)}
                      placeholder="เช่น Claude Desktop"
                      className="w-full bg-[#0b0d16] border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">ระดับสิทธิ์ (Scope)</label>
                    <select
                      value={tokenScope}
                      onChange={(e) => setTokenScope(e.target.value as McpTokenScope)}
                      className="w-full bg-[#0b0d16] border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                    >
                      <option value="read_write">อ่าน + จัดเด็ค/เพิ่มคลัง (ห้ามลบ)</option>
                      <option value="read">อ่านคลังและเด็คอย่างเดียว (Read-Only)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">อายุการใช้งาน</label>
                    <select
                      value={tokenExpiryDays ?? 0}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setTokenExpiryDays(val > 0 ? val : null);
                      }}
                      className="w-full bg-[#0b0d16] border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                    >
                      <option value={30}>30 วัน (แนะนำ)</option>
                      <option value={90}>90 วัน</option>
                      <option value={0}>ไม่มีวันหมดอายุ</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="btn-generate-mcp-token"
                  disabled={mcpBusy}
                  onClick={handleGenerateMcpToken}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-950/40 transition-all cursor-pointer disabled:opacity-50"
                >
                  + สร้าง MCP Token ใหม่
                </button>

                {newlyCreatedRawToken && (
                  <div
                    data-testid="mcp-new-token-box"
                    className="bg-amber-950/50 border border-amber-400/60 rounded-xl p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-amber-300">
                        🔑 Token ของคุณ (แสดงครั้งเดียว กรุณาคัดลอกเก็บไว้):
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(newlyCreatedRawToken);
                          setMcpFeedback('คัดลอก Token ลงคลิปบอร์ดแล้ว ✓');
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] cursor-pointer shrink-0"
                      >
                        <Copy className="w-3 h-3" /> คัดลอก Token
                      </button>
                    </div>
                    <div className="font-mono text-xs text-white bg-black/60 px-3 py-2 rounded-lg select-all break-all border border-amber-500/30">
                      {newlyCreatedRawToken}
                    </div>
                  </div>
                )}
              </div>

              {/* Active Tokens List */}
              {mcpTokens.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-300">
                    รายการ Token ที่สร้างไว้ ({mcpTokens.length})
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {mcpTokens.map((t) => (
                      <div
                        key={t.tokenHash}
                        className="flex items-center justify-between bg-[#0e111d] border border-slate-800 rounded-xl px-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200 truncate">{t.label}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                t.revoked
                                  ? 'bg-rose-950 text-rose-400 border border-rose-500/30'
                                  : t.scope === 'read_write'
                                  ? 'bg-amber-950/70 text-amber-300 border border-amber-500/30'
                                  : 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/30'
                              }`}
                            >
                              {t.revoked ? 'ยกเลิกแล้ว' : t.scope}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">{t.tokenPrefix}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!t.revoked && (
                            <button
                              type="button"
                              onClick={() => handleRevokeToken(t.tokenHash)}
                              className="px-2 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-500/30 text-[11px] font-bold cursor-pointer"
                            >
                              ยกเลิกสิทธิ์
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteTokenRecord(t.tokenHash)}
                            title="ลบรายการ"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ready-to-Copy MCP Client JSON Config */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-300">
                    การตั้งค่า MCP JSON (วางใน Claude / Cursor / Antigravity ได้เลย):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(sampleMcpConfigJson);
                      setMcpFeedback('คัดลอกการตั้งค่า MCP JSON แล้ว ✓');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" /> คัดลอก JSON Config
                  </button>
                </div>
                <pre
                  data-testid="mcp-config-snippet"
                  className="bg-[#0b0d16] border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-amber-200/90 overflow-x-auto"
                >
                  {sampleMcpConfigJson}
                </pre>
              </div>

              {mcpFeedback && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 rounded-xl px-3 py-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{mcpFeedback}</span>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Backup JSON Modal (rendered via Portal to escape header backdrop-filter) */}
      {showBackupModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowBackupModal(false)}
          >
            <div
              className="bg-[#121522] border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl my-auto font-['Prompt',sans-serif] text-slate-100"
              onClick={(e) => e.stopPropagation()}
              data-testid="collection-backup-modal"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-extrabold text-white">
                  สำรองและกู้คืนข้อมูลสมุดสะสม (JSON Backup)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowBackupModal(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
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
          </div>,
          document.body
        )}
    </div>
  );
}
