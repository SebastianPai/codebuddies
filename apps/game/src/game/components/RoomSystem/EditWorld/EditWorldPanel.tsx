"use client";

import { useEffect, useMemo, useState } from "react";
import { UserMinus, Ban, Shield, Trash2, Plus, Camera, ImageOff } from "lucide-react";
import Modal from "../../shared/Modal";
import Button from "../../shared/Button";
import { EffectivePermissions } from "../../../types/permissions";
import { useTranslation } from "../../../../i18n/useTranslation";
import styles from "./EditWorldPanel.module.css";

// Antes había una pestaña "Apariencia" (fondo + iluminación) acá adentro,
// justo al lado de "Permisos" — visualmente sugería que cambiar el fondo o
// la luz de la sala era una acción "administrativa" como otorgar roles.
// Fondo/iluminación son en realidad herramientas de EDICIÓN de la sala (se
// usan mientras decorás, con vista previa inmediata), así que ahora viven
// solo en el Modo Construcción (ver BuildModePanel, pestaña "Ambiente"),
// junto al resto de las herramientas de construir/decorar. Este panel queda
// exclusivamente para configuración administrativa. "info" (identidad
// editable: nombre/descripción/etc.) y la pestaña de solo-lectura de
// estadísticas también compartían el nombre "Información", lo que confundía
// cuál era cuál. Ver el comentario sobre `tabs` más abajo para el reordenamiento.
type TabId =
  | "roomInfo"
  | "access"
  | "limits"
  | "guests"
  | "permissions"
  | "stats";

type AccessMode = "PUBLIC" | "PRIVATE_INVITE_ONLY" | "PRIVATE_REQUEST";

interface RoomDetails {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  tags?: string[];
  thumbnailUrl?: string | null;
  accessMode?: AccessMode;
  isVipOnly: boolean;
  maxUsers: number;
  ambientLightIntensity?: number | null;
  rating: number;
  totalVotes: number;
  createdAt: string;
  owner?: { id: string; username: string };
  background?: { id: string } | null;
  _count?: { users: number; ratings?: number };
}

interface Friend {
  id: string;
  username: string;
  avatarUrl?: string | null;
}

interface Guest {
  id: string;
  userId: string;
  role: string;
  customRoleId?: string | null;
  user: Friend;
  customRole?: CustomRole | null;
}

interface PendingInvite {
  id: string;
  toUser: Friend;
  createdAt: string;
}

interface PendingJoinRequest {
  id: string;
  createdAt: string;
  user: Friend;
}

interface CustomRole {
  id: string;
  roomId: string;
  name: string;
  colorHex?: string | null;
  canPlaceObjects: boolean;
  canMoveObjects: boolean;
  canRotateObjects: boolean;
  canDeleteObjects: boolean;
  canEditConfig: boolean;
  canChangeFloor: boolean;
  canChangeWalls: boolean;
  canChangeBackground: boolean;
  canManageGuests: boolean;
  canManagePermissions: boolean;
  canModifyLighting: boolean;
}

// Antes las 11 casillas se mostraban en una sola grilla plana, en el orden
// en que se agregaron al esquema — sin ninguna jerarquía visual, costaba
// escanear "¿qué puede hacer este rol?" de un vistazo. Agrupadas por tema
// (qué puede hacer con OBJETOS, qué puede CONFIGURAR de la sala, qué puede
// ADMINISTRAR sobre otras personas) se lee mucho más rápido — mismo criterio
// que un panel de permisos de Discord/Notion, no una lista de checkboxes.
const PERMISSION_GROUPS: Array<{
  titleKey: string;
  flags: Array<{ key: keyof EffectivePermissions; labelKey: string }>;
}> = [
  {
    titleKey: "editworld.permGroupObjects",
    flags: [
      { key: "canPlaceObjects", labelKey: "editworld.permPlaceObjects" },
      { key: "canMoveObjects", labelKey: "editworld.permMoveObjects" },
      { key: "canRotateObjects", labelKey: "editworld.permRotateObjects" },
      { key: "canDeleteObjects", labelKey: "editworld.permDeleteObjects" },
      { key: "canChangeFloor", labelKey: "editworld.permChangeFloor" },
      { key: "canChangeWalls", labelKey: "editworld.permChangeWalls" },
    ],
  },
  {
    titleKey: "editworld.permGroupRoom",
    flags: [
      { key: "canEditConfig", labelKey: "editworld.permEditConfig" },
      { key: "canChangeBackground", labelKey: "editworld.permChangeBackground" },
      { key: "canModifyLighting", labelKey: "editworld.permModifyLighting" },
    ],
  },
  {
    titleKey: "editworld.permGroupAdmin",
    flags: [
      { key: "canManageGuests", labelKey: "editworld.permManageGuests" },
      { key: "canManagePermissions", labelKey: "editworld.permManagePermissions" },
    ],
  },
];

const PERMISSION_FLAGS = PERMISSION_GROUPS.flatMap((group) => group.flags);

interface Props {
  roomId: string;
  permissions: EffectivePermissions;
  onClose: () => void;
  // Permite abrir el panel directo en una pestaña puntual (ej. los botones
  // "Información"/"Invitar" de la tarjeta de sala en RightSidebar), en vez
  // de forzar siempre a pasar por la primera pestaña visible.
  initialTab?: TabId;
}

// Panel de administración de la sala — antes repartido entre la pestaña
// "background" de BuildModePanel y las acciones de dueño de RoomDetailsModal
// (que sigue existiendo tal cual para la vista de "unirse a una sala" desde
// la lista, sin tocar). Este es el único lugar nuevo que agrupa todo lo
// administrativo mientras ya estás DENTRO de tu sala.
export default function EditWorldPanel({ roomId, permissions, onClose, initialTab }: Props) {
  const t = useTranslation();
  const socket = typeof window !== "undefined" ? (window as any).phaserSocket : null;

  // Orden pensado como un flujo: quién es la sala (info) → cómo se ve
  // (apariencia) → quién entra (acceso/límites) → quién ya está y qué puede
  // hacer (invitados/permisos) → estadísticas de solo lectura al final, que
  // es lo que menos se consulta día a día.
  const tabs = useMemo(
    () =>
      (
        [
          { id: "roomInfo", label: t("editworld.tabRoomInfo"), show: permissions.canEditConfig },
          { id: "access", label: t("editworld.tabAccess"), show: permissions.canEditConfig },
          { id: "limits", label: t("editworld.tabLimits"), show: permissions.canEditConfig },
          { id: "guests", label: t("editworld.tabGuests"), show: permissions.canManageGuests },
          {
            id: "permissions",
            label: t("editworld.tabPermissions"),
            show: permissions.canManagePermissions,
          },
          { id: "stats", label: t("editworld.tabStats"), show: true },
        ] as Array<{ id: TabId; label: string; show: boolean }>
      ).filter((tab) => tab.show),
    [permissions, t],
  );

  const [requestedTab, setRequestedTab] = useState<TabId | null>(initialTab ?? null);
  // Derivado en vez de sincronizado por efecto: si los permisos cambian y la
  // pestaña pedida deja de existir, cae a la primera visible sin necesitar
  // un setState dentro de un useEffect.
  const tab = requestedTab && tabs.some((t2) => t2.id === requestedTab)
    ? requestedTab
    : (tabs[0]?.id ?? "stats");

  const [room, setRoom] = useState<RoomDetails | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleDetails = (data: RoomDetails) => {
      if (data?.id === roomId) setRoom(data);
    };
    const handleUpdated = (data: RoomDetails) => {
      if (data?.id === roomId) setRoom((prev) => (prev ? { ...prev, ...data } : data));
    };

    socket.emit("getRoomDetails", { roomId });
    socket.on("room:details", handleDetails);
    socket.on("room:updated", handleUpdated);

    return () => {
      socket.off("room:details", handleDetails);
      socket.off("room:updated", handleUpdated);
    };
  }, [socket, roomId]);

  return (
    <Modal
      title={t("editworld.title")}
      onClose={onClose}
      style={{ width: "min(760px, 100%)", maxHeight: "min(680px, 90vh)" }}
      contentClassName={styles.modalContent}
    >
      <div className={styles.layout}>
        <div className={styles.tabStrip} role="tablist">
          {tabs.map((t2) => (
            <button
              key={t2.id}
              type="button"
              role="tab"
              aria-selected={tab === t2.id}
              className={`${styles.tabButton} ${tab === t2.id ? styles.tabActive : ""}`}
              onClick={() => setRequestedTab(t2.id)}
            >
              {t2.label}
            </button>
          ))}
        </div>

        <div className={styles.tabContent}>
          {!room ? (
            <p className={styles.loading}>{t("common.loading")}</p>
          ) : (
            <>
              {tab === "roomInfo" && <RoomInfoTab room={room} socket={socket} />}
              {tab === "access" && <AccessTab room={room} socket={socket} />}
              {tab === "limits" && <LimitsTab room={room} socket={socket} />}
              {tab === "guests" && <GuestsTab roomId={roomId} socket={socket} />}
              {tab === "permissions" && <PermissionsTab roomId={roomId} socket={socket} />}
              {tab === "stats" && <StatsTab room={room} />}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ====================== INFORMACIÓN DE LA SALA ======================
// Antes el nombre era un <input> más, al mismo nivel visual que categoría o
// etiquetas — la miniatura (que ya se auto-capturaba cada tanto desde
// LobbyScene, ver scheduleRoomThumbnailCapture) ni siquiera se mostraba acá.
// Ahora la miniatura + el nombre viven juntos como una sola "portada" de la
// sala, dándole personalidad a cada una en vez de ser un dato más del form.
function RoomInfoTab({ room, socket }: { room: RoomDetails; socket: any }) {
  const t = useTranslation();
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description ?? "");
  const [category, setCategory] = useState(room.category ?? "");
  const [tagsInput, setTagsInput] = useState((room.tags ?? []).join(", "));
  const [saving, setSaving] = useState(false);

  const save = () => {
    if (!socket) return;
    setSaving(true);
    socket.emit("room:update", {
      roomId: room.id,
      name: name.trim(),
      description,
      category: category.trim(),
      tags: tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
    window.setTimeout(() => setSaving(false), 400);
  };

  return (
    <div className={styles.form}>
      <div className={styles.coverCard}>
        <div
          className={`${styles.coverImage} ${!room.thumbnailUrl ? styles.coverImageEmpty : ""}`}
          style={room.thumbnailUrl ? { backgroundImage: `url(${room.thumbnailUrl})` } : undefined}
        >
          {!room.thumbnailUrl && (
            <div className={styles.coverPlaceholder}>
              <ImageOff size={26} />
              <span>{t("editworld.coverPlaceholder")}</span>
            </div>
          )}

          <div className={styles.coverAutoBadge} title={t("editworld.coverHint")}>
            <Camera size={12} />
            {t("editworld.coverAutoBadge")}
          </div>

          <div className={styles.coverScrim}>
            <input
              className={styles.coverNameInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder={t("editworld.nameLabel")}
            />
          </div>
        </div>
      </div>
      <p className={styles.hint}>{t("editworld.coverHint")}</p>

      <label className={styles.field}>
        <span>{t("editworld.descriptionLabel")}</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
        />
      </label>

      <label className={styles.field}>
        <span>{t("editworld.categoryLabel")}</span>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          maxLength={40}
          placeholder={t("editworld.categoryPlaceholder")}
        />
      </label>

      <label className={styles.field}>
        <span>{t("editworld.tagsLabel")}</span>
        <input
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder={t("editworld.tagsPlaceholder")}
        />
      </label>

      <Button variant="primary" onClick={save} disabled={saving}>
        {saving ? t("common.saving") : t("common.saveChanges")}
      </Button>
    </div>
  );
}

// ====================== ACCESO ======================
function AccessTab({ room, socket }: { room: RoomDetails; socket: any }) {
  const t = useTranslation();
  const [accessMode, setAccessMode] = useState<AccessMode>(room.accessMode ?? "PUBLIC");
  const [isVipOnly, setIsVipOnly] = useState(room.isVipOnly);
  const [saving, setSaving] = useState(false);

  const options: Array<{ value: AccessMode; label: string; description: string }> = [
    {
      value: "PUBLIC",
      label: t("editworld.accessPublicLabel"),
      description: t("editworld.accessPublicDescription"),
    },
    {
      value: "PRIVATE_REQUEST",
      label: t("editworld.accessRequestLabel"),
      description: t("editworld.accessRequestDescription"),
    },
    {
      value: "PRIVATE_INVITE_ONLY",
      label: t("editworld.accessInviteOnlyLabel"),
      description: t("editworld.accessInviteOnlyDescription"),
    },
  ];

  const save = () => {
    if (!socket) return;
    setSaving(true);
    socket.emit("room:update", { roomId: room.id, accessMode, isVipOnly });
    window.setTimeout(() => setSaving(false), 400);
  };

  return (
    <div className={styles.form}>
      <div className={styles.radioGroup}>
        {options.map((option) => (
          <label key={option.value} className={styles.radioOption}>
            <input
              type="radio"
              name="accessMode"
              checked={accessMode === option.value}
              onChange={() => setAccessMode(option.value)}
            />
            <div>
              <span className={styles.radioLabel}>{option.label}</span>
              <p className={styles.radioDescription}>{option.description}</p>
            </div>
          </label>
        ))}
      </div>

      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={isVipOnly}
          onChange={(e) => setIsVipOnly(e.target.checked)}
        />
        {t("editworld.vipOnlyLabel")}
      </label>

      <Button variant="primary" onClick={save} disabled={saving}>
        {saving ? t("common.saving") : t("common.saveChanges")}
      </Button>
    </div>
  );
}

// ====================== LÍMITES ======================
function LimitsTab({ room, socket }: { room: RoomDetails; socket: any }) {
  const t = useTranslation();
  const [maxUsers, setMaxUsers] = useState(room.maxUsers);
  const [saving, setSaving] = useState(false);

  const save = () => {
    if (!socket) return;
    setSaving(true);
    socket.emit("room:update", { roomId: room.id, maxUsers });
    window.setTimeout(() => setSaving(false), 400);
  };

  return (
    <div className={styles.form}>
      <label className={styles.field}>
        <span>{t("editworld.maxUsersLabel")}</span>
        <input
          type="number"
          min={1}
          max={100}
          value={maxUsers}
          onChange={(e) => setMaxUsers(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
        />
      </label>
      <p className={styles.hint}>{t("editworld.maxObjectsComingSoon")}</p>

      <Button variant="primary" onClick={save} disabled={saving}>
        {saving ? t("common.saving") : t("common.saveChanges")}
      </Button>
    </div>
  );
}

// ====================== ESTADÍSTICAS (solo lectura) ======================
function StatsTab({ room }: { room: RoomDetails }) {
  const t = useTranslation();

  return (
    <div className={styles.infoGrid}>
      <div className={styles.infoRow}>
        <span>{t("editworld.infoOwner")}</span>
        <strong>{room.owner?.username ?? "—"}</strong>
      </div>
      <div className={styles.infoRow}>
        <span>{t("editworld.infoVisitors")}</span>
        <strong>{room._count?.users ?? 0}</strong>
      </div>
      <div className={styles.infoRow}>
        <span>{t("editworld.infoRating")}</span>
        <strong>
          {room.rating?.toFixed(1) ?? "0.0"} ({room.totalVotes ?? 0})
        </strong>
      </div>
      <div className={styles.infoRow}>
        <span>{t("editworld.infoCreatedAt")}</span>
        <strong>{new Date(room.createdAt).toLocaleDateString()}</strong>
      </div>
    </div>
  );
}

// ====================== INVITADOS ======================
function GuestsTab({ roomId, socket }: { roomId: string; socket: any }) {
  const t = useTranslation();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [joinRequests, setJoinRequests] = useState<PendingJoinRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [query, setQuery] = useState("");
  const [roles, setRoles] = useState<CustomRole[]>([]);

  const refresh = () => {
    if (!socket) return;
    socket.emit("room:guests:list", { roomId });
    socket.emit("room:invites:list", { roomId });
    socket.emit("room:role:list", { roomId });
    socket.emit("room:joinRequests:list", { roomId });
  };

  useEffect(() => {
    if (!socket) return;

    const handleGuests = (data: any) => data.roomId === roomId && setGuests(data.guests);
    const handleInvites = (data: any) => data.roomId === roomId && setInvites(data.invites);
    const handleRoles = (data: any) => data.roomId === roomId && setRoles(data.roles);
    const handleFriends = (data: any) => data.roomId === roomId && setFriends(data.friends);
    // room:joinRequests es el mismo evento que ya usaba RoomDetailsModal
    // (flujo "Solicitud para entrar") — antes solo se podía ver/aprobar
    // desde el listado de salas, nunca estando ya adentro de la tuya.
    const handleJoinRequests = (data: any) =>
      data.roomId === roomId && setJoinRequests(data.requests);

    socket.on("room:guests:list", handleGuests);
    socket.on("room:invites:list", handleInvites);
    socket.on("room:role:list", handleRoles);
    socket.on("room:invite:friends-search:result", handleFriends);
    socket.on("room:joinRequests", handleJoinRequests);
    socket.on("room:invite:revoked", refresh);
    socket.on("room:permission:revoked", refresh);
    socket.on("room:guest:kicked", refresh);
    socket.on("room:inviteSent", refresh);
    socket.on("room:joinRequest:approved", refresh);
    socket.on("room:joinRequest:rejected", refresh);

    refresh();

    return () => {
      socket.off("room:guests:list", handleGuests);
      socket.off("room:invites:list", handleInvites);
      socket.off("room:role:list", handleRoles);
      socket.off("room:invite:friends-search:result", handleFriends);
      socket.off("room:joinRequests", handleJoinRequests);
      socket.off("room:invite:revoked", refresh);
      socket.off("room:permission:revoked", refresh);
      socket.off("room:guest:kicked", refresh);
      socket.off("room:inviteSent", refresh);
      socket.off("room:joinRequest:approved", refresh);
      socket.off("room:joinRequest:rejected", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, roomId]);

  useEffect(() => {
    if (!socket) return;
    const handle = window.setTimeout(() => {
      socket.emit("room:invite:friends-search", { roomId, query: query || undefined });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [socket, roomId, query]);

  return (
    <div className={styles.form}>
      <div>
        <h4 className={styles.sectionTitle}>{t("editworld.guestsInviteTitle")}</h4>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("editworld.guestsSearchFriendsPlaceholder")}
        />
        <div className={styles.list}>
          {friends.map((friend) => (
            <div key={friend.id} className={styles.listRow}>
              <span>{friend.username}</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => socket?.emit("room:invite", { roomId, toUserId: friend.id })}
              >
                <Plus size={13} /> {t("editworld.inviteButton")}
              </Button>
            </div>
          ))}
          {!friends.length && <p className={styles.hint}>{t("editworld.guestsNoFriendsFound")}</p>}
        </div>
      </div>

      {joinRequests.length > 0 && (
        <div>
          <h4 className={styles.sectionTitle}>{t("editworld.guestsJoinRequestsTitle")}</h4>
          <div className={styles.list}>
            {joinRequests.map((request) => (
              <div key={request.id} className={styles.listRow}>
                <span>{request.user.username}</span>
                <div className={styles.rowActions}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => socket?.emit("room:joinRequest:approve", { requestId: request.id })}
                  >
                    {t("common.accept")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => socket?.emit("room:joinRequest:reject", { requestId: request.id })}
                  >
                    {t("editworld.rejectButton")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {invites.length > 0 && (
        <div>
          <h4 className={styles.sectionTitle}>{t("editworld.guestsPendingInvitesTitle")}</h4>
          <div className={styles.list}>
            {invites.map((invite) => (
              <div key={invite.id} className={styles.listRow}>
                <span>{invite.toUser.username}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => socket?.emit("room:invite:revoke", { inviteId: invite.id })}
                >
                  <Ban size={13} /> {t("editworld.revokeButton")}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className={styles.sectionTitle}>{t("editworld.guestsCurrentTitle")}</h4>
        <div className={styles.list}>
          {guests.map((guest) => (
            <div key={guest.id} className={styles.listRow}>
              <span>
                {guest.user.username}
                <em className={styles.roleBadge}>{guest.customRole?.name ?? guest.role}</em>
              </span>
              <div className={styles.rowActions}>
                <select
                  value={guest.customRoleId ?? ""}
                  onChange={(e) =>
                    socket?.emit("room:role:assign", {
                      roomId,
                      targetUserId: guest.userId,
                      roleId: e.target.value || null,
                    })
                  }
                >
                  <option value="">{t("editworld.legacyRoleOption", { role: guest.role })}</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    socket?.emit("room:permission:revoke", { roomId, targetUserId: guest.userId })
                  }
                  title={t("editworld.revokePermissionButton")}
                >
                  <Shield size={13} />
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => socket?.emit("room:guest:kick", { roomId, targetUserId: guest.userId })}
                  title={t("editworld.kickButton")}
                >
                  <UserMinus size={13} />
                </Button>
              </div>
            </div>
          ))}
          {!guests.length && <p className={styles.hint}>{t("editworld.guestsNoneYet")}</p>}
        </div>
      </div>
    </div>
  );
}

// ====================== ROLES PERSONALIZADOS ======================
function PermissionsTab({ roomId, socket }: { roomId: string; socket: any }) {
  const t = useTranslation();
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [editing, setEditing] = useState<CustomRole | null>(null);

  const refresh = () => socket?.emit("room:role:list", { roomId });

  useEffect(() => {
    if (!socket) return;
    const handleRoles = (data: any) => data.roomId === roomId && setRoles(data.roles);
    socket.on("room:role:list", handleRoles);
    socket.on("room:role:created", refresh);
    socket.on("room:role:updated", refresh);
    socket.on("room:role:deleted", refresh);
    refresh();
    return () => {
      socket.off("room:role:list", handleRoles);
      socket.off("room:role:created", refresh);
      socket.off("room:role:updated", refresh);
      socket.off("room:role:deleted", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, roomId]);

  const blankRole: CustomRole = {
    id: "",
    roomId,
    name: "",
    canPlaceObjects: false,
    canMoveObjects: false,
    canRotateObjects: false,
    canDeleteObjects: false,
    canEditConfig: false,
    canChangeFloor: false,
    canChangeWalls: false,
    canChangeBackground: false,
    canManageGuests: false,
    canManagePermissions: false,
    canModifyLighting: false,
  };

  if (editing) {
    return (
      <RoleEditor
        role={editing}
        onCancel={() => setEditing(null)}
        onSave={(role) => {
          if (role.id) {
            socket?.emit("room:role:update", { roleId: role.id, ...roleFlags(role), name: role.name });
          } else {
            socket?.emit("room:role:create", { roomId, name: role.name, ...roleFlags(role) });
          }
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className={styles.form}>
      <Button variant="secondary" onClick={() => setEditing(blankRole)}>
        <Plus size={13} /> {t("editworld.newRoleButton")}
      </Button>

      <div className={styles.list}>
        {roles.map((role) => (
          <div key={role.id} className={styles.listRow}>
            <span>{role.name}</span>
            <div className={styles.rowActions}>
              <Button size="sm" variant="secondary" onClick={() => setEditing(role)}>
                {t("common.edit")}
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => socket?.emit("room:role:delete", { roleId: role.id })}
              >
                <Trash2 size={13} />
              </Button>
            </div>
          </div>
        ))}
        {!roles.length && <p className={styles.hint}>{t("editworld.rolesNoneYet")}</p>}
      </div>
    </div>
  );
}

function roleFlags(role: CustomRole) {
  const flags: Record<string, boolean> = {};
  PERMISSION_FLAGS.forEach(({ key }) => {
    flags[key] = role[key];
  });
  return flags;
}

function RoleEditor({
  role,
  onCancel,
  onSave,
}: {
  role: CustomRole;
  onCancel: () => void;
  onSave: (role: CustomRole) => void;
}) {
  const t = useTranslation();
  const [draft, setDraft] = useState<CustomRole>(role);

  const toggle = (key: keyof EffectivePermissions) =>
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className={styles.form}>
      <label className={styles.field}>
        <span>{t("editworld.roleNameLabel")}</span>
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          maxLength={40}
          placeholder={t("editworld.roleNamePlaceholder")}
        />
      </label>

      <div className={styles.permissionGroups}>
        {PERMISSION_GROUPS.map((group) => (
          <div key={group.titleKey} className={styles.permissionGroup}>
            <h5 className={styles.permissionGroupTitle}>{t(group.titleKey)}</h5>
            <div className={styles.checkboxGrid}>
              {group.flags.map(({ key, labelKey }) => (
                <label key={key} className={styles.checkboxRow}>
                  <input type="checkbox" checked={draft[key]} onChange={() => toggle(key)} />
                  {t(labelKey)}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.rowActions}>
        <Button variant="ghost" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button
          variant="primary"
          disabled={!draft.name.trim()}
          onClick={() => onSave(draft)}
        >
          {t("common.saveChanges")}
        </Button>
      </div>
    </div>
  );
}
