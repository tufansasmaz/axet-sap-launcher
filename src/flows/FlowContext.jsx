import React, { createContext, useContext, useMemo, useRef, useState, useCallback } from 'react';
import { FlowModel } from './FlowModel';
import { applyTemplate, TEMPLATES } from './templates.js';

const FlowCtx = createContext(null);

export function FlowProvider({ children }) {
  const modelRef = useRef(null);
  if (!modelRef.current) {
    modelRef.current = new FlowModel();
    // Kullanıcı isteği: "http://localhost:49275/#flow/... buraya host
    // edilmiş uygulamayı YENİ BİR UYGULAMA PENCERESİYLE BİREBİR bizim
    // uygulamamıza aktar" — bu flow Şablonlar modalının ARKASINA gizli bir
    // seçenek olarak DEĞİL, uygulama açılır açılmaz gerçek bir SEKME (tab)
    // olarak doğrudan görünüyor — tıpkı orijinal axet.flows Designer
    // penceresini açtığında o flow'u anında görmek gibi. Boş "Flow 1"
    // sekmesi de KORUNUYOR (kullanıcı sıfırdan başlamak isterse), sadece
    // aktif/görünen sekme bu import edilmiş flow oluyor.
    const importedTabId = modelRef.current.addTab('NoSQL Sorgu + AI Ozet + Audit');
    applyTemplate(modelRef.current, 'nosql-query-agent-summary');
    modelRef.current.setActiveTab(importedTabId);
    // Bu kurulum adımları (addTab/addNode/connect/autoLayout) FlowModel'in
    // kendi _pushUndo() mekanizmasını tetikliyor - kullanıcı ilk "Geri Al"
    // (Ctrl+Z) yaptığında bu başlangıç kurulumunu GERİ ALMAMASI için undo/
    // redo yığınları burada temizleniyor, sanki flow hep böyle gelmiş gibi.
    modelRef.current._undoStack = [];
    modelRef.current._redoStack = [];
  }
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const value = useMemo(() => ({ model: modelRef.current, version, bump }), [version, bump]);

  return <FlowCtx.Provider value={value}>{children}</FlowCtx.Provider>;
}

export function useFlow() {
  const ctx = useContext(FlowCtx);
  if (!ctx) throw new Error('useFlow, FlowProvider icinde kullanilmali');
  return ctx;
}

export function useFlowSnapshot() {
  const { model, version } = useFlow();
  return useMemo(() => model.snapshot(), [model, version]);
}

export function useFlowActions() {
  const { model, bump } = useFlow();
  return useMemo(
    () => ({
      importFlow: (arr) => {
        model.importFlow(arr);
        model.tabs.forEach((t) => model.autoLayout(t.id));
        model.subflows.forEach((s) => model.autoLayout(s.id));
        bump();
      },
      resetFlow: () => {
        model.resetFlow();
        bump();
      },
      addNode: (payload) => {
        const id = model.addNode(payload);
        bump();
        return id;
      },
      updateNode: (id, changes) => {
        model.updateNode(id, changes);
        bump();
      },
      moveNodes: (moves) => {
        model.moveNodes(moves);
        bump();
      },
      removeNode: (id) => {
        model.removeNode(id);
        bump();
      },
      removeNodes: (ids) => {
        model.removeNodes(ids);
        bump();
      },
      connect: (fromId, toId, output = 0) => {
        model.connect(fromId, toId, output);
        bump();
      },
      disconnect: (fromId, toId, output = 0) => {
        model.disconnect(fromId, toId, output);
        bump();
      },
      disconnectMany: (links) => {
        model.disconnectMany(links);
        bump();
      },
      autoLayout: (containerId) => {
        model.autoLayout(containerId);
        bump();
      },
      addTab: (name) => {
        const id = model.addTab(name);
        bump();
        return id;
      },
      renameTab: (id, name) => {
        model.renameTab(id, name);
        bump();
      },
      setTabDescription: (id, description) => {
        model.setTabDescription(id, description);
        bump();
      },
      setActiveTab: (id) => {
        model.setActiveTab(id);
        bump();
      },
      removeTab: (id) => {
        model.removeTab(id);
        bump();
      },
      createSubflow: (name) => {
        const id = model.createSubflow(name);
        bump();
        return id;
      },
      renameSubflow: (id, name) => {
        model.renameSubflow(id, name);
        bump();
      },
      editSubflow: (id) => {
        model.editSubflow(id);
        bump();
      },
      exitSubflow: () => {
        model.exitSubflow();
        bump();
      },
      removeSubflow: (id) => {
        model.removeSubflow(id);
        bump();
      },
      createSubflowFromSelection: (nodeIds, name) => {
        const result = model.createSubflowFromSelection(nodeIds, name);
        bump();
        return result;
      },
      applyTemplateInNewTab: (templateId) => {
        const template = TEMPLATES.find((t) => t.id === templateId);
        const tabId = model.addTab(template?.name);
        applyTemplate(model, templateId);
        bump();
        return tabId;
      },
      undo: () => {
        const ok = model.undo();
        if (ok) bump();
        return ok;
      },
      redo: () => {
        const ok = model.redo();
        if (ok) bump();
        return ok;
      },
      copySelection: (ids) => model.copySelection(ids),
      pasteClipboard: () => {
        const newIds = model.pasteClipboard();
        bump();
        return newIds;
      },
      duplicateSelection: (ids) => {
        const newIds = model.duplicateSelection(ids);
        bump();
        return newIds;
      }
    }),
    [model, bump]
  );
}

export function useUndoState() {
  const { model, version } = useFlow();
  return useMemo(() => ({ canUndo: model.canUndo(), canRedo: model.canRedo() }), [model, version]);
}
