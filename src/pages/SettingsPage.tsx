import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  Building2,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Database,
  Info,
  RotateCcw,
  Save,
  ShieldAlert,
  Truck,
  Waypoints,
} from 'lucide-react'

import { VEHICLE_TYPE_OPTIONS } from '../domain/constants'
import type { SystemSettings, VehicleType } from '../domain/models'
import { hasTokens, settingsApi } from '../services/api'
import { useAppStore } from '../store/app-store'
import { Button, InlineMessage, PageHeader } from '../components/ui'

// ─── Types ───────────────────────────────────────────────────────────────────

type SectionId = 'company' | 'operation' | 'notifications' | 'security' | 'system'

interface NavItem {
  id: SectionId
  label: string
  icon: React.ReactNode
  danger?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { id: 'company',       label: 'Firma Bilgileri',       icon: <Building2   size={16} /> },
  { id: 'operation',     label: 'Operasyon',             icon: <Truck       size={16} /> },
  { id: 'notifications', label: 'Bildirimler',           icon: <Bell        size={16} /> },
  { id: 'security',      label: 'Güvenlik',              icon: <ShieldAlert size={16} /> },
  { id: 'system',        label: 'Sistem Bilgisi',        icon: <Info        size={16} /> },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function SettingsPage() {
  const data               = useAppStore((s) => s.data)
  const updateSystemSettings = useAppStore((s) => s.updateSystemSettings)

  const [form, setForm]       = useState<SystemSettings>({ ...data.systemSettings })
  const [saved, setSaved]     = useState<SystemSettings>({ ...data.systemSettings })
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [apiMode, setApiMode] = useState(false)
  const [activeSection, setActiveSection] = useState<SectionId>('company')
  const [copied, setCopied]   = useState(false)
  const [savingDone, setSavingDone] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const isDirty = JSON.stringify(form) !== JSON.stringify(saved)

  useEffect(() => {
    if (!hasTokens()) return
    setLoading(true)
    settingsApi.get()
      .then((s) => {
        const loaded: SystemSettings = {
          companyName: s.companyName,
          workStartHour: s.workStartHour,
          workEndHour: s.workEndHour,
          maxDailyShipments: s.maxDailyShipments,
          defaultVehicleType: s.defaultVehicleType as VehicleType,
          notificationsEnabled: s.notificationsEnabled,
          autoAssignRamp: s.autoAssignRamp,
          maintenanceMode: s.maintenanceMode,
        }
        setForm(loaded)
        setSaved(loaded)
        setApiMode(true)
      })
      .catch(() => setApiMode(false))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Ctrl+S / Cmd+S save shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && isDirty) {
        e.preventDefault()
        formRef.current?.requestSubmit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isDirty])

  function handleChange<K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) {
    setForm((c) => ({ ...c, [key]: value }))
    setMessage(null)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (apiMode) {
      try {
        const result = await settingsApi.update({
          companyName: form.companyName,
          workStartHour: form.workStartHour,
          workEndHour: form.workEndHour,
          maxDailyShipments: form.maxDailyShipments,
          defaultVehicleType: form.defaultVehicleType,
          notificationsEnabled: form.notificationsEnabled,
          autoAssignRamp: form.autoAssignRamp,
          maintenanceMode: form.maintenanceMode,
        })
        setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
        if (result.ok) { setSaved({ ...form }); flashSaved() }
      } catch {
        const result = updateSystemSettings(form)
        setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
        if (result.ok) { setSaved({ ...form }); flashSaved() }
      }
    } else {
      const result = updateSystemSettings(form)
      setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
      if (result.ok) { setSaved({ ...form }); flashSaved() }
    }
  }

  function flashSaved() {
    setSavingDone(true)
    setTimeout(() => setSavingDone(false), 2200)
  }

  function handleReset() {
    if (apiMode && hasTokens()) {
      setLoading(true)
      settingsApi.get()
        .then((s) => {
          const loaded: SystemSettings = {
            companyName: s.companyName,
            workStartHour: s.workStartHour,
            workEndHour: s.workEndHour,
            maxDailyShipments: s.maxDailyShipments,
            defaultVehicleType: s.defaultVehicleType as VehicleType,
            notificationsEnabled: s.notificationsEnabled,
            autoAssignRamp: s.autoAssignRamp,
            maintenanceMode: s.maintenanceMode,
          }
          setForm(loaded)
          setSaved(loaded)
        })
        .catch(() => { setForm({ ...data.systemSettings }); setSaved({ ...data.systemSettings }) })
        .finally(() => setLoading(false))
    } else {
      setForm({ ...data.systemSettings })
      setSaved({ ...data.systemSettings })
    }
    setMessage(null)
  }

  function copyApiKey() {
    navigator.clipboard.writeText('sk-demo-flowdock-api-key-xxxx').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  if (loading) {
    return (
      <div className="page-stack">
        <PageHeader eyebrow="Sistem" title="Sistem Ayarları" description="Yükleniyor..." />
        <div className="settings-loading">
          <div className="settings-loading__spinner" />
          <p>Ayarlar yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Sistem Yapılandırması"
        title={`Sistem Ayarları${apiMode ? ' (API)' : ''}`}
        description="Şirket bilgileri, çalışma saatleri, kapasite limitleri ve otomasyon tercihlerini yönetin."
        actions={
          <div className="settings-header-actions">
            {isDirty && (
              <span className="settings-dirty-badge">
                <span className="settings-dirty-badge__dot" />
                Kaydedilmemiş değişiklikler
              </span>
            )}
            {savingDone && (
              <span className="settings-saved-badge">
                <Check size={13} />
                Kaydedildi
              </span>
            )}
            <Button type="button" variant="secondary" size="sm" onClick={handleReset} disabled={!isDirty}>
              <RotateCcw size={14} />
              Sıfırla
            </Button>
            <Button size="sm" onClick={() => formRef.current?.requestSubmit()} disabled={!isDirty}>
              <Save size={14} />
              Kaydet
              <kbd className="settings-kbd">⌘S</kbd>
            </Button>
          </div>
        }
      />

      {message && <InlineMessage kind={message.kind} message={message.text} />}

      <div className="settings-layout">
        {/* ── Sidebar nav ── */}
        <nav className="settings-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`settings-nav__item${activeSection === item.id ? ' settings-nav__item--active' : ''}${item.danger ? ' settings-nav__item--danger' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              <span className="settings-nav__icon">{item.icon}</span>
              <span className="settings-nav__label">{item.label}</span>
              <ChevronRight size={14} className="settings-nav__chevron" />
            </button>
          ))}
        </nav>

        {/* ── Content ── */}
        <form ref={formRef} onSubmit={handleSubmit} className="settings-content">

          {activeSection === 'company' && (
            <SettingsSection
              title="Firma Bilgileri"
              description="Organizasyon adı ve kurumsal kimlik bilgileri. Tüm raporlarda ve çıktılarda görünür."
              icon={<Building2 size={18} />}
              tone="primary"
            >
              <SettingsField label="Şirket Adı" hint="Raporlarda ve yazışmalarda görünecek resmi isim.">
                <input
                  className="settings-input"
                  value={form.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  placeholder="Örn: Gratis Lojistik A.Ş."
                />
              </SettingsField>
              <SettingsField label="API Erişim Anahtarı" hint="Entegrasyonlar için kullanılan read-only anahtar." readonly>
                <div className="settings-api-key">
                  <input
                    className="settings-input settings-input--mono"
                    readOnly
                    value="sk-demo-flowdock-api-key-xxxx"
                  />
                  <button type="button" className="settings-api-key__copy" onClick={copyApiKey} title="Kopyala">
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </SettingsField>
            </SettingsSection>
          )}

          {activeSection === 'operation' && (
            <SettingsSection
              title="Operasyon Ayarları"
              description="Vardiya saatleri, günlük kapasite limitleri ve varsayılan araç parametreleri."
              icon={<Clock size={18} />}
              tone="info"
            >
              <div className="settings-subsection-label">Çalışma Saatleri</div>
              <SettingsField label="Vardiya Başlangıcı" hint="Sistemin operasyonel hale geldiği saat.">
                <div className="settings-time-input-wrap">
                  <input
                    className="settings-input settings-input--compact"
                    type="time"
                    value={form.workStartHour}
                    onChange={(e) => handleChange('workStartHour', e.target.value)}
                  />
                  <span className="settings-time-divider">—</span>
                  <input
                    className="settings-input settings-input--compact"
                    type="time"
                    value={form.workEndHour}
                    onChange={(e) => handleChange('workEndHour', e.target.value)}
                  />
                  <span className="settings-time-badge">
                    {calcHourDiff(form.workStartHour, form.workEndHour)} saat
                  </span>
                </div>
              </SettingsField>

              <div className="settings-subsection-label" style={{ marginTop: '1.5rem' }}>Kapasite</div>
              <SettingsField label="Günlük Maks. Sevkiyat" hint="Bir günde oluşturulabilecek en fazla sevkiyat sayısı (1–500).">
                <div className="settings-number-wrap">
                  <button
                    type="button"
                    className="settings-number-btn"
                    onClick={() => handleChange('maxDailyShipments', Math.max(1, form.maxDailyShipments - 5))}
                  >−</button>
                  <input
                    className="settings-input settings-input--compact settings-input--center"
                    type="number"
                    min={1}
                    max={500}
                    value={form.maxDailyShipments}
                    onChange={(e) => handleChange('maxDailyShipments', Number(e.target.value))}
                  />
                  <button
                    type="button"
                    className="settings-number-btn"
                    onClick={() => handleChange('maxDailyShipments', Math.min(500, form.maxDailyShipments + 5))}
                  >+</button>
                </div>
              </SettingsField>
              <SettingsField label="Varsayılan Araç Türü" hint="Yeni taleplerde önceden seçili gelecek araç tipi.">
                <select
                  className="settings-input settings-input--compact"
                  value={form.defaultVehicleType}
                  onChange={(e) => handleChange('defaultVehicleType', e.target.value as VehicleType)}
                >
                  {VEHICLE_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </SettingsField>
            </SettingsSection>
          )}

          {activeSection === 'notifications' && (
            <SettingsSection
              title="Bildirimler ve Otomasyon"
              description="Sistem bildirim tercihleri ve otomatik işlem kuralları."
              icon={<Waypoints size={18} />}
              tone="success"
            >
              <SettingsToggle
                label="Sistem Bildirimleri"
                hint="Durum değişikliklerinde ilgili rollere otomatik bildirim gönderilsin."
                checked={form.notificationsEnabled}
                onChange={(v) => handleChange('notificationsEnabled', v)}
              />
              <SettingsToggle
                label="Otomatik Rampa Atama"
                hint="Onaylanan araçlara müsait rampa otomatik olarak atansın. Uygun rampa bulunamazsa manuel atama gerekir."
                checked={form.autoAssignRamp}
                onChange={(v) => handleChange('autoAssignRamp', v)}
              />
            </SettingsSection>
          )}

          {activeSection === 'security' && (
            <SettingsSection
              title="Güvenlik"
              description="Bu bölümdeki değişiklikler sistemin erişilebilirliğini doğrudan etkiler. Dikkatli kullanın."
              icon={<ShieldAlert size={18} />}
              tone="danger"
            >
              <SettingsToggle
                label="Bakım Modu"
                hint="Sistemi bakım moduna alır. Yalnızca yöneticiler erişebilir; diğer tüm kullanıcılara erişim engeli gösterilir."
                checked={form.maintenanceMode}
                onChange={(v) => handleChange('maintenanceMode', v)}
                danger
              />
              <div className="settings-danger-note">
                <ShieldAlert size={14} />
                <span>Bakım modunu aktif etmeden önce tüm operatörleri bilgilendirdiğinizden emin olun.</span>
              </div>
            </SettingsSection>
          )}

          {activeSection === 'system' && (
            <SettingsSection
              title="Sistem Bilgisi"
              description="Uygulama sürümü, ortam ve teknik bilgiler. Bu alandaki değerler salt okunurdur."
              icon={<Database size={18} />}
              tone="neutral"
            >
              <SettingsInfoRow label="Uygulama"         value="FlowDock Logistics" />
              <SettingsInfoRow label="Sürüm"            value="1.0.0-demo" />
              <SettingsInfoRow label="Ortam"            value={apiMode ? 'API (Canlı Backend)' : 'Demo (Yerel Zustand)'} highlight={apiMode} />
              <SettingsInfoRow label="Veri Kaynağı"     value={apiMode ? 'PostgreSQL (API)' : 'Zustand LocalStorage'} />
              <SettingsInfoRow label="Toplam Kullanıcı" value={String(data.users.length)} />
              <SettingsInfoRow label="Toplam Lokasyon"  value={String(data.locations.length)} />
              <SettingsInfoRow label="Toplam Rampa"     value={String(data.ramps.length)} />
            </SettingsSection>
          )}

        </form>
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcHourDiff(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const diff = (eh * 60 + em) - (sh * 60 + sm)
  return diff > 0 ? diff / 60 : 0
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SettingsSection({
  title, description, icon, tone, children,
}: {
  title: string
  description: string
  icon: React.ReactNode
  tone: 'primary' | 'info' | 'success' | 'danger' | 'neutral'
  children: React.ReactNode
}) {
  return (
    <div className={`settings-panel settings-panel--${tone}`}>
      <div className="settings-panel__header">
        <div className={`settings-panel__icon settings-panel__icon--${tone}`}>{icon}</div>
        <div>
          <h2 className="settings-panel__title">{title}</h2>
          <p className="settings-panel__desc">{description}</p>
        </div>
      </div>
      <div className="settings-panel__body">{children}</div>
    </div>
  )
}

function SettingsField({ label, hint, children, readonly }: {
  label: string
  hint: string
  children: React.ReactNode
  readonly?: boolean
}) {
  return (
    <div className="settings-field">
      <div className="settings-field__meta">
        <span className="settings-field__label">{label}{readonly && <span className="settings-field__readonly-badge">salt okunur</span>}</span>
        <span className="settings-field__hint">{hint}</span>
      </div>
      <div className="settings-field__control">{children}</div>
    </div>
  )
}

function SettingsToggle({ label, hint, checked, onChange, danger }: {
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
  danger?: boolean
}) {
  return (
    <div className={`settings-toggle-row${danger ? ' settings-toggle-row--danger' : ''}`}>
      <div className="settings-toggle-row__text">
        <span className="settings-toggle-row__label">{label}</span>
        <span className="settings-toggle-row__hint">{hint}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`settings-switch${checked ? ' settings-switch--on' : ''}${danger && checked ? ' settings-switch--danger' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="settings-switch__thumb" />
      </button>
    </div>
  )
}

function SettingsInfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="settings-info-row">
      <span className="settings-info-row__label">{label}</span>
      <span className={`settings-info-row__value${highlight ? ' settings-info-row__value--highlight' : ''}`}>{value}</span>
    </div>
  )
}
