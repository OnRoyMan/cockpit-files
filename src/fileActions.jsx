/*
 * This file is part of Cockpit.
 *
 * Copyright (C) 2017 Red Hat, Inc.
 *
 * Cockpit is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * Cockpit is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Cockpit; If not, see <http://www.gnu.org/licenses/>.
 */

import cockpit from "cockpit";
import React, { useEffect, useState } from "react";
import {
    Button,
    Form, FormGroup,
    FormSection,
    FormSelect,
    FormSelectOption,
    Modal,
    Radio,
    Stack,
    TextInput,
} from "@patternfly/react-core";

import { useDialogs } from "dialogs.jsx";
import { InlineNotification } from "cockpit-components-inline-notification";
import { useFile } from "hooks.js";
import { etc_group_syntax as etcGroupSyntax, etc_passwd_syntax as etcPasswdSyntax } from "pam_user_parser.js";
import { FileAutoComplete } from "../pkg/lib/cockpit-components-file-autocomplete";
import { spawnCreateDirectory, spawnCreateLink, spawnDeleteItem, spawnEditPermissions, spawnForceDelete, spawnRenameItem } from "./apis/spawnHelpers";
import { permissions } from "./common";

const _ = cockpit.gettext;

export const createDirectory = (Dialogs, currentPath, selected) => {
    Dialogs.show(<CreateDirectoryModal currentPath={currentPath} selected={selected} />);
};

export const createLink = (Dialogs, currentPath, files, selected) => {
    Dialogs.show(
        <CreateLinkModal
          currentPath={currentPath} selected={selected}
          files={files.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 : ((b.name.toLowerCase() > a.name.toLowerCase()) ? -1 : 0))}
        />);
};

export const deleteItem = (Dialogs, options) => {
    Dialogs.show(
        <ConfirmDeletionDialog
          selected={options.selected} itemPath={options.itemPath}
          path={options.path}
          setHistory={options.setHistory} setHistoryIndex={options.setHistoryIndex}
        />);
};

export const renameItem = (Dialogs, options) => {
    Dialogs.show(
        <RenameItemModal
          path={options.path}
          selected={options.selected}
          setHistory={options.setHistory} setHistoryIndex={options.setHistoryIndex}
        />);
};

export const editPermissions = (Dialogs, options) => {
    Dialogs.show(
        <EditPermissionsModal
          selected={options.selected} path={options.path}
        />);
};

export const ConfirmDeletionDialog = ({ selected, itemPath, path, setHistory, setHistoryIndex }) => {
    const Dialogs = useDialogs();

    const modalTitle = selected.type === "file"
        ? cockpit.format(_("Delete file $0?"), selected.name)
        : cockpit.format(_("Delete directory $0?"), selected.name);

    return (
        <Modal
          position="top"
          title={modalTitle}
          titleIconVariant="warning"
          isOpen
          onClose={Dialogs.close}
          footer={
              <>
                  <Button variant="danger" onClick={() => spawnDeleteItem({ Dialogs, selected, itemPath, path, setHistory, setHistoryIndex })}>{_("Delete")}</Button>
                  <Button variant="link" onClick={Dialogs.close}>{_("Cancel")}</Button>
              </>
          }
        />
    );
};

export const ForceDeleteModal = ({ selected, itemPath, initialError }) => {
    const Dialogs = useDialogs();
    const [errorMessage, setErrorMessage] = useState(initialError);
    const [deleteFailed, setDeleteFailed] = useState(false);

    const modalTitle = selected.type === "file"
        ? cockpit.format(_("Force delete file $0?"), selected.name)
        : cockpit.format(_("Force delete directory $0?"), selected.name);

    return (
        <Modal
          position="top"
          title={modalTitle}
          titleIconVariant="warning"
          isOpen
          onClose={Dialogs.close}
          footer={!deleteFailed &&
          <>
              <Button variant="danger" onClick={() => spawnForceDelete({ Dialogs, itemPath, setDeleteFailed, setErrorMessage })}>{_("Force delete")}</Button>
              <Button variant="link" onClick={Dialogs.close}>{_("Cancel")}</Button>
          </>}
        >
            <InlineNotification
              type="danger"
              text={errorMessage}
              isInline
            />
        </Modal>
    );
};

export const CreateDirectoryModal = ({ selected, currentPath }) => {
    const Dialogs = useDialogs();
    const [name, setName] = useState("");
    const [errorMessage, setErrorMessage] = useState(undefined);

    return (
        <Modal
          position="top"
          title={_("Create directory")}
          isOpen
          onClose={Dialogs.close}
          footer={errorMessage === undefined &&
          <>
              <Button variant="primary" onClick={() => spawnCreateDirectory({ Dialogs, selected, currentPath, name, setErrorMessage })}>{_("Create")}</Button>
              <Button variant="link" onClick={Dialogs.close}>{_("Cancel")}</Button>
          </>}
        >
            <Stack>
                {errorMessage !== undefined &&
                <InlineNotification
                  type="danger"
                  text={errorMessage}
                  isInline
                />}
                <Form isHorizontal>
                    <FormGroup label={_("Directory name")}>
                        <TextInput
                          value={name} onChange={(_, val) => setName(val)}
                          id="create-directory-input"
                        />
                    </FormGroup>
                </Form>
            </Stack>
        </Modal>
    );
};

export const RenameItemModal = ({ path, selected, setHistory, setHistoryIndex }) => {
    const Dialogs = useDialogs();
    const [name, setName] = useState(selected.name);
    const [errorMessage, setErrorMessage] = useState(undefined);

    return (
        <Modal
          position="top"
          title={selected.type === "file" ? _("Rename file") : _("Rename directory")}
          isOpen
          onClose={Dialogs.close}
          footer={errorMessage === undefined &&
          <>
              <Button variant="primary" onClick={() => spawnRenameItem({ Dialogs, path, selected, name, setErrorMessage, setHistory, setHistoryIndex })}>{_("Rename")}</Button>
              <Button variant="link" onClick={Dialogs.close}>{_("Cancel")}</Button>
          </>}
        >
            <Stack>
                {errorMessage !== undefined &&
                <InlineNotification
                  type="danger"
                  text={errorMessage}
                  isInline
                />}
                <Form isHorizontal>
                    <FormGroup label={selected.type === "file" ? _("File name") : _("Directory name")}>
                        <TextInput
                          value={name} onChange={(_, val) => setName(val)}
                          id="rename-item-input"
                        />
                    </FormGroup>
                </Form>
            </Stack>
        </Modal>
    );
};

export const CreateLinkModal = ({ currentPath, selected }) => {
    const Dialogs = useDialogs();
    const [originalName, setOriginalName] = useState(selected?.name || "");
    const [newName, setNewName] = useState("");
    const [type, setType] = useState("symbolic");
    const [errorMessage, setErrorMessage] = useState(undefined);

    return (
        <Modal
          position="top"
          title={_("New link")}
          isOpen
          onClose={Dialogs.close}
          footer={
              <>
                  <Button variant="primary" onClick={() => spawnCreateLink({ Dialogs, currentPath, type, originalName, newName, setErrorMessage })}>{_("Create link")}</Button>
                  <Button variant="link" onClick={Dialogs.close}>{_("Cancel")}</Button>
              </>
          }
        >
            <Stack>
                {errorMessage !== undefined &&
                <InlineNotification
                  type="danger"
                  text={errorMessage}
                  isInline
                />}
                <Form isHorizontal>
                    <FormGroup label={_("Original")}>
                        <div id="create-link-original-wrapper">
                            <FileAutoComplete
                              onChange={setOriginalName} placeholder={_("Path to file")}
                              superuser="try" value={currentPath + originalName}
                              id="create-link-original"
                            />
                        </div>
                    </FormGroup>
                    <FormGroup label={_("New")}>
                        <TextInput
                          value={newName} onChange={(_, val) => setNewName(val)}
                          id="create-link-new"
                        />
                    </FormGroup>
                    <FormGroup label={_("Link type")} isInline>
                        <Radio
                          name="create-link-type" label={_("Symbolic")}
                          value="symbolic" onChange={() => { setType("symbolic") }}
                          id="create-link-symbolic" isChecked={type === "symbolic"}
                        />
                        <Radio
                          name="create-link-type" label={_("Hard")}
                          value="new" onChange={() => { setType("hard") }}
                          id="create-link-hard" isChecked={type === "hard"}
                        />
                    </FormGroup>
                </Form>
            </Stack>
        </Modal>
    );
};

export const EditPermissionsModal = ({ selected, path }) => {
    const Dialogs = useDialogs();
    const [name, setName] = useState(selected.name);
    const [owner, setOwner] = useState(selected.owner);
    const [ownerAccess, setOwnerAccess] = useState(selected.permissions[0]);
    const [group, setGroup] = useState(selected.group);
    const [groupAccess, setGroupAccess] = useState(selected.permissions[1]);
    const [otherAccess, setOtherAccess] = useState(selected.permissions[2]);
    const [errorMessage, setErrorMessage] = useState(undefined);
    const accounts = useFile("/etc/passwd", { syntax: etcPasswdSyntax });
    const groups = useFile("/etc/group", { syntax: etcGroupSyntax });
    const logindef = useFile("/etc/login.defs", { superuser: true });

    //  Handle also the case where logindef == null, i.e. the file does not exist.
    //  While that's unusual, "empty /etc" is a goal, and it shouldn't crash the page.
    const [minGid, setMinGid] = useState(500);
    const [maxGid, setMaxGid] = useState(60000);
    const [minUid, setMinUid] = useState(500);
    const [maxUid, setMaxUid] = useState(60000);
    useEffect(() => {
        if (!logindef)
            return;

        const minGid = parseInt(logindef.match(/^GID_MIN\s+(\d+)/m)[1]);
        const maxGid = parseInt(logindef.match(/^GID_MAX\s+(\d+)/m)[1]);
        const minUid = parseInt(logindef.match(/^UID_MIN\s+(\d+)/m)[1]);
        const maxUid = parseInt(logindef.match(/^UID_MAX\s+(\d+)/m)[1]);

        if (minGid)
            setMinGid(minGid);
        if (maxGid)
            setMaxGid(maxGid);
        if (minUid)
            setMinUid(minUid);
        if (maxUid)
            setMaxUid(maxUid);
    }, [logindef]);

    let filteredAccounts, filteredGroups;
    if (accounts && groups) {
        filteredAccounts = accounts.filter(a => a.uid >= minUid && a.uid <= maxUid);
        filteredGroups = groups.filter(g => g.gid >= minGid && g.gid <= maxGid);
    }

    const changeOwner = (owner) => {
        setOwner(owner);
        const currentOwner = filteredAccounts.find(a => a.name === owner);
        const currentGroup = filteredGroups.find(g => g.name === group);
        if (currentGroup?.gid !== currentOwner?.gid && !currentGroup?.userlist.includes(currentOwner?.name)) {
            setGroup(filteredGroups.find(g => g.gid === currentOwner.gid).name);
        }
    };

    const options = { Dialogs, selected, path, owner, group, ownerAccess, groupAccess, otherAccess, name, setErrorMessage };

    return (
        <Modal
          position="top"
          variant="medium"
          title={selected.type === "file" ? _("File properties and access") : _("Directory properties and access")}
          isOpen
          onClose={Dialogs.close}
          footer={
              <>
                  <Button variant="primary" onClick={() => spawnEditPermissions({ ...options, changeAll: false })}>{_("Change")}</Button>
                  {selected.type === "directory" && <Button variant="secondary" onClick={() => spawnEditPermissions({ ...options, changeAll: true })}>{_("Change permissions for enclosed files")}</Button>}
                  <Button variant="link" onClick={Dialogs.close}>{_("Cancel")}</Button>
              </>
          }
        >
            <Stack>
                {errorMessage !== undefined &&
                <InlineNotification
                  type="danger"
                  text={errorMessage}
                  isInline
                />}
                <Form isHorizontal>
                    <FormSection title={_("File properties")}>
                        <FormGroup label={selected.type === "file" ? _("File name") : _("Directory name")} fieldId="edit-permissions-name">
                            <TextInput
                              value={name} onChange={(_, val) => setName(val)}
                              id="edit-permissions-name"
                            />
                        </FormGroup>
                        <FormGroup label={_("Owner")} fieldId="edit-permissions-owner">
                            <FormSelect
                              onChange={(_, val) => changeOwner(val)} id="edit-permissions-owner"
                              value={owner}
                            >
                                {filteredAccounts?.map(a => {
                                    return (
                                        <FormSelectOption
                                          key={a.name} label={a.name}
                                          value={a.name}
                                        />
                                    );
                                })}
                            </FormSelect>
                        </FormGroup>
                        <FormGroup label={_("Group")} fieldId="edit-permissions-group">
                            <FormSelect
                              onChange={(_, val) => setGroup(val)} id="edit-permissions-group"
                              value={group}
                            >
                                {filteredGroups?.map(g => {
                                    return (
                                        <FormSelectOption
                                          key={g.name} label={g.name}
                                          value={g.name}
                                        />
                                    );
                                })}
                            </FormSelect>
                        </FormGroup>
                    </FormSection>
                    <FormSection title={_("Access")}>
                        <FormGroup label={_("Owner access")} fieldId="edit-permissions-owner-access">
                            <FormSelect
                              value={ownerAccess} onChange={(_, val) => { setOwnerAccess(val) }}
                              id="edit-permissions-owner-access"
                            >
                                {permissions.map(p => (
                                    <FormSelectOption
                                      key={p.value} value={p.value}
                                      label={p.label}
                                    />
                                ))}
                            </FormSelect>
                        </FormGroup>
                        <FormGroup label={_("Group access")} fieldId="edit-permissions-group-access">
                            <FormSelect
                              value={groupAccess} onChange={(_, val) => { setGroupAccess(val) }}
                              id="edit-permissions-group-access"
                            >
                                {permissions.map(p => (
                                    <FormSelectOption
                                      key={p.value} value={p.value}
                                      label={p.label}
                                    />
                                ))}
                            </FormSelect>
                        </FormGroup>
                        <FormGroup label={_("Others access")} fieldId="edit-permissions-other-access">
                            <FormSelect
                              value={otherAccess} onChange={(_, val) => { setOtherAccess(val) }}
                              id="edit-permissions-other-access"
                            >
                                {permissions.map(p => (
                                    <FormSelectOption
                                      key={p.value} value={p.value}
                                      label={p.label}
                                    />
                                ))}
                            </FormSelect>
                        </FormGroup>
                    </FormSection>
                </Form>
            </Stack>
        </Modal>
    );
};
