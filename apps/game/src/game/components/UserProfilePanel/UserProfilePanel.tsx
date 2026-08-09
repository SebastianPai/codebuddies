"use client";

import React from "react";
import { Coins, Gem, Star } from "lucide-react";
import "./UserProfilePanel.css";
import AvatarPreview from "../AvatarEditor/AvatarPreview";
import { useAvatar } from "../../hooks/useAvatar";
import { useSocket } from "../../hooks/useSocket";
import UserBadges from "../shared/UserBadges";
import { useTranslation } from "../../../i18n/useTranslation";

export default function UserProfilePanel({
  username,
  level,
  coins,
  diamonds = 0,
}: {
  username: string;
  level: number;
  coins: number;
  diamonds?: number;
}) {
  const t = useTranslation();
  const socket = useSocket();
  const avatar = useAvatar(socket);

  const progress = (level % 10) * 10;

  return (
    <div className="profile-overlay">
      <div className="profile-container">
        <div className="panel principal">
          <div className="avatar-frame">
            <AvatarPreview
              avatarSlots={avatar?.slots || []}
              skinColor={avatar?.skinColor}
              width={92}
              height={92}
            />
          </div>

          <div className="info-section">
            <div className="username">
              {username}
              <UserBadges username={username} size={13} />
            </div>

            <div className="level-row">
              <span className="level-number">{t("quickmenu.level", { level })}</span>
              <span className="star">
                <Star size={13} fill="currentColor" />
              </span>
            </div>

            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="panel currency-panel">
          <div className="currency-item">
            <span className="currency-icon">
              <Coins size={16} />
            </span>
            <span className="currency-amount">{coins.toLocaleString()}</span>
          </div>
          <div className="currency-item">
            <span className="currency-icon">
              <Gem size={16} />
            </span>
            <span className="currency-amount">{diamonds.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
