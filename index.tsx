/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import ErrorBoundary from "@components/ErrorBoundary";
import { CopyIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { Channel, RenderModalProps } from "@vencord/discord-types";
import { ChannelType } from "@vencord/discord-types/enums";
import { ChannelStore, Constants, Menu, Modal, openModal, PermissionsBits, PermissionStore, RestAPI, showToast, TextInput, useState } from "@webpack/common";

const DuplicateCategoryModal = ErrorBoundary.wrap(({ category, ...props }: RenderModalProps & { category: Channel; }) => {
    const [name, setName] = useState(category.name);
    const [copyPermissions, setCopyPermissions] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function createCategory() {
        if (saving || !name.trim()) return;
        setSaving(true);
        setError(null);
        try {
            const source = ChannelStore.getChannel(category.id);
            if (!source || source.type !== ChannelType.GUILD_CATEGORY)
                throw new Error("The original category no longer exists.");
            await RestAPI.post({
                url: Constants.Endpoints.GUILD_CHANNELS(source.guild_id),
                body: {
                    name: name.trim(),
                    type: ChannelType.GUILD_CATEGORY,
                    permission_overwrites: copyPermissions ? Object.values(source.permissionOverwrites ?? {}).map(overwrite => ({
                        id: overwrite.id,
                        type: overwrite.type,
                        allow: String(overwrite.allow),
                        deny: String(overwrite.deny)
                    })) : []
                }
            });
            props.onClose();
            showToast({ text: "Category created.", variant: "success" });
        } catch (error) {
            console.error("[DuplicateCategory] Failed to create category", error);
            setError(error instanceof Error ? error.message : "Could not create the category. Check your permissions and try again.");
            setSaving(false);
        }
    }

    return (
        <Modal
            {...props}
            title="Create Category"
            size="md"
            notice={error ? { message: error, type: "critical" } : undefined}
            actions={[
                { text: "Cancel", variant: "secondary", onClick: props.onClose, disabled: saving },
                { text: "Create Category", variant: "primary", onClick: createCategory, loading: saving, disabled: saving || !name.trim() }
            ]}
        >
            <form onSubmit={event => { event.preventDefault(); void createCategory(); }}>
                <label
                    htmlFor="vc-duplicate-category-name"
                    style={{
                        display: "block",
                        fontSize: "14px",
                        lineHeight: "18px",
                        fontWeight: 600,
                        color: "var(--header-secondary, #b5bac1)",
                        marginBottom: 8,
                        fontFamily: "var(--font-primary, 'gg sans', sans-serif)"
                    }}
                >
                    Category Name
                </label>
                <TextInput
                    id="vc-duplicate-category-name"
                    autoFocus
                    value={name}
                    maxLength={100}
                    disabled={saving}
                    placeholder="New Category"
                    onChange={setName}
                />
            </form>
            <div style={{ marginTop: 16 }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        height: 24,
                        marginBottom: 8
                    }}
                >
                    <div
                        role="button"
                        tabIndex={0}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: "16px",
                            lineHeight: "24px",
                            height: 24,
                            fontWeight: 600,
                            color: "var(--header-primary, #f2f3f5)",
                            cursor: saving ? "default" : "pointer",
                            userSelect: "none",
                            outline: "none"
                        }}
                        onClick={() => {
                            if (!saving) setCopyPermissions(prev => !prev);
                        }}
                        onKeyDown={e => {
                            if ((e.key === "Enter" || e.key === " ") && !saving) {
                                e.preventDefault();
                                setCopyPermissions(prev => !prev);
                            }
                        }}
                    >
                        <CopyIcon width={16} height={16} style={{ color: "currentColor", flexShrink: 0 }} />
                        <span>Copy Permissions</span>
                    </div>
                    <div
                        role="switch"
                        aria-checked={copyPermissions}
                        tabIndex={0}
                        style={{
                            width: 40,
                            minWidth: 40,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: copyPermissions ? "var(--brand-500, #5865f2)" : "var(--bg-mod-strong, #4e5058)",
                            position: "relative",
                            cursor: saving ? "default" : "pointer",
                            transition: "background-color 0.15s ease-in-out",
                            flexShrink: 0,
                            outline: "none"
                        }}
                        onClick={() => {
                            if (!saving) setCopyPermissions(prev => !prev);
                        }}
                        onKeyDown={e => {
                            if ((e.key === "Enter" || e.key === " ") && !saving) {
                                e.preventDefault();
                                setCopyPermissions(prev => !prev);
                            }
                        }}
                    >
                        <div
                            style={{
                                width: 18,
                                height: 18,
                                borderRadius: "50%",
                                backgroundColor: "#ffffff",
                                position: "absolute",
                                top: 3,
                                left: 3,
                                transform: copyPermissions ? "translateX(16px)" : "translateX(0px)",
                                transition: "transform 0.15s ease-in-out",
                                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.2)"
                            }}
                        />
                    </div>
                </div>
                <div
                    style={{
                        fontSize: "14px",
                        lineHeight: "20px",
                        fontWeight: 400,
                        color: "var(--text-muted, #949ba4)"
                    }}
                >
                    Copy the original category's permissions to the new category. Turn this off to use the server's default permissions.
                </div>
            </div>
        </Modal>
    );
}, { noop: false });

const patchCategoryMenu: NavContextMenuPatchCallback = (children, { channel }: { channel: Channel; }) => {
    try {
        if (channel?.type !== ChannelType.GUILD_CATEGORY || !PermissionStore.can(PermissionsBits.MANAGE_CHANNELS, channel)) return;
        const editIds = ["edit-channel", "edit-category"];
        const group = findGroupChildrenByChildId(editIds, children);
        if (!group) return;
        const editIndex = group.findIndex(item => editIds.includes(item?.props?.id));
        if (group.some(item => item?.props?.id === "vc-duplicate-category")) return;
        group.splice(editIndex + 1, 0,
            <Menu.MenuItem
                id="vc-duplicate-category"
                key="vc-duplicate-category"
                label="Duplicate Category"
                action={() => openModal(props => <DuplicateCategoryModal {...props} category={channel} />)}
            />
        );
    } catch (error) {
        console.error("[DuplicateCategory] Could not add category menu item", error);
    }
};

export default definePlugin({
    name: "DuplicateCategory",
    description: "Adds an option to duplicate a category with the same permissions.",
    tags: ["Utility"],
    authors: [{
        name: "lethied",
        id: 892246841016590386n
    }],
    contextMenus: {
        "channel-context": patchCategoryMenu,
        "channel-category-context": patchCategoryMenu
    }
});
