import { useState } from 'react'
import type { ExpenseType } from '../types'
import { isPresetCategory } from '../types'
import {
  getMergedCategories,
  addCustomSubCategory,
  addCustomMainCategory,
  updateCustomCategory,
  deleteCustomCategory,
  countExpenses
} from '../storage'

interface Props {
  onCategoriesChanged: () => void
  refreshTrigger?: number
}

export default function CategoryManager({ onCategoriesChanged, refreshTrigger }: Props) {
  // refreshTrigger 变化时 React 会重新渲染，getMergedCategories 自动读取最新数据
  const [refresh, setRefresh] = useState(0)
  const [activeType, setActiveType] = useState<ExpenseType>('expense')
  const merged = getMergedCategories(activeType)

  // 新建大类的表单状态
  const [showAddMain, setShowAddMain] = useState(false)
  const [newMainName, setNewMainName] = useState('')
  const [newMainSubs, setNewMainSubs] = useState('')

  // 正在编辑的分类
  const [editingMain, setEditingMain] = useState<string | null>(null)
  const [editMainValue, setEditMainValue] = useState('')
  const [editingSub, setEditingSub] = useState<{ main: string; oldName: string } | null>(null)
  const [editSubValue, setEditSubValue] = useState('')

  // 正在添加小类的大类
  const [addingSubTo, setAddingSubTo] = useState<string | null>(null)
  const [newSubValue, setNewSubValue] = useState('')

  // 展开/收起的大类
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function triggerRefresh() {
    setRefresh((r) => r + 1)
    onCategoriesChanged()
  }

  function handleTypeChange(type: ExpenseType) {
    setActiveType(type)
    setExpanded(new Set())
    setEditingMain(null)
    setEditingSub(null)
    setAddingSubTo(null)
    setShowAddMain(false)
  }

  function toggleExpand(main: string) {
    const next = new Set(expanded)
    if (next.has(main)) {
      next.delete(main)
    } else {
      next.add(main)
    }
    setExpanded(next)
  }

  // ===== 新建大类 =====
  function handleAddMain() {
    const name = newMainName.trim()
    if (!name) { alert('请输入大类名称'); return }
    if (merged[name]) { alert('该大类名称已存在'); return }
    const subs = newMainSubs.split(/[,，、]/).map((s) => s.trim()).filter((s) => s !== '')
    if (subs.length === 0) { alert('请至少输入一个小类名称（用逗号分隔）'); return }
    addCustomMainCategory(activeType, name, subs)
    setNewMainName('')
    setNewMainSubs('')
    setShowAddMain(false)
    triggerRefresh()
  }

  // ===== 添加小类 =====
  function handleAddSub(mainCategory: string) {
    const sub = newSubValue.trim()
    if (!sub) { alert('请输入小类名称'); return }
    if ((merged[mainCategory] || []).includes(sub)) { alert('该小类名称已存在'); return }
    addCustomSubCategory(activeType, mainCategory, sub)
    setNewSubValue('')
    setAddingSubTo(null)
    triggerRefresh()
  }

  // ===== 编辑大类名称 =====
  function startEditMain(oldName: string) {
    setEditingMain(oldName)
    setEditMainValue(oldName)
  }
  function saveEditMain() {
    const newName = editMainValue.trim()
    if (!newName || newName === editingMain) { setEditingMain(null); return }
    if (merged[newName]) { alert('该名称已存在'); return }
    updateCustomCategory(activeType, editingMain!, newName, true)
    setEditingMain(null)
    triggerRefresh()
  }

  // ===== 编辑小类名称 =====
  function startEditSub(main: string, oldName: string) {
    setEditingSub({ main, oldName })
    setEditSubValue(oldName)
  }
  function saveEditSub() {
    const newName = editSubValue.trim()
    if (!newName || !editingSub || newName === editingSub.oldName) { setEditingSub(null); return }
    if ((merged[editingSub.main] || []).includes(newName)) { alert('该名称已存在'); return }
    updateCustomCategory(activeType, editingSub.oldName, newName, false, editingSub.main)
    setEditingSub(null)
    triggerRefresh()
  }

  // ===== 删除 =====
  function handleDeleteMain(mainCategory: string) {
    const count = countRecordsInCategory(mainCategory, null)
    const msg = count > 0
      ? `确定删除「${mainCategory}」及其小类？\n\n该分类下有 ${count} 笔记录将迁移到默认分类。\n\n此操作不可撤销！`
      : `确定删除「${mainCategory}」及其小类？\n\n此操作不可撤销！`
    if (!confirm(msg)) return
    deleteCustomCategory(activeType, mainCategory, true)
    triggerRefresh()
  }

  function handleDeleteSub(mainCategory: string, subCategory: string) {
    const count = countRecordsInCategory(mainCategory, subCategory)
    const msg = count > 0
      ? `确定删除「${subCategory}」？\n\n该分类下有 ${count} 笔记录将迁移到默认分类。\n\n此操作不可撤销！`
      : `确定删除「${subCategory}」？\n\n此操作不可撤销！`
    if (!confirm(msg)) return
    deleteCustomCategory(activeType, subCategory, false, mainCategory)
    triggerRefresh()
  }

  function countRecordsInCategory(mainCategory: string, subCategory: string | null): number {
    return countExpenses({ type: activeType, category: mainCategory, subCategory })
  }

  const mainCategories = Object.keys(merged)

  return (
    <div className="category-manager">
      <div className="cat-header">
        <h2>分类管理</h2>
        <div className="cat-type-tabs">
          <button
            className={`cat-type-tab ${activeType === 'expense' ? 'active' : ''}`}
            onClick={() => handleTypeChange('expense')}
          >
            支出
          </button>
          <button
            className={`cat-type-tab ${activeType === 'income' ? 'active' : ''}`}
            onClick={() => handleTypeChange('income')}
          >
            收入
          </button>
        </div>
        <button className="cat-add-main-btn" onClick={() => setShowAddMain(true)}>
          + 新建大类
        </button>
      </div>

      {/* 新建大类弹窗 */}
      {showAddMain && (
        <div className="modal-overlay" onClick={() => setShowAddMain(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>新建{activeType === 'expense' ? '支出' : '收入'}大类</h3>
            <div className="form-group">
              <label>大类名称（可含 emoji）</label>
              <input
                type="text"
                className="cat-edit-input"
                placeholder={activeType === 'expense' ? '例如：🧑‍🍳 自己做饭' : '例如：🏠 房租收入'}
                value={newMainName}
                onChange={(e) => setNewMainName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>小类名称（用逗号分隔）</label>
              <input
                type="text"
                className="cat-edit-input"
                placeholder="例如：买菜、调料、厨房工具"
                value={newMainSubs}
                onChange={(e) => setNewMainSubs(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowAddMain(false)}>取消</button>
              <button className="modal-btn confirm" onClick={handleAddMain}>创建</button>
            </div>
          </div>
        </div>
      )}

      {/* 分类列表 */}
      <div className="cat-list">
        {mainCategories.map((main) => {
          const subs = merged[main]
          const mainPreset = isPresetCategory(activeType, main)
          const isExpanded = expanded.has(main)

          return (
            <div key={main} className="cat-group">
              <div className="cat-row main-row">
                <span className="cat-expand-btn" onClick={() => toggleExpand(main)}>
                  {isExpanded ? '▼' : '▶'}
                </span>

                {editingMain === main ? (
                  <input
                    className="cat-edit-input inline"
                    value={editMainValue}
                    onChange={(e) => setEditMainValue(e.target.value)}
                    onBlur={saveEditMain}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditMain()
                      if (e.key === 'Escape') setEditingMain(null)
                    }}
                    autoFocus
                  />
                ) : (
                  <span className="cat-name main-name">{main}</span>
                )}

                <span className="cat-count">({subs.length}个小类)</span>

                {mainPreset ? (
                  <span className="cat-lock" title="预置分类，不可修改">🔒</span>
                ) : (
                  <div className="cat-actions">
                    {editingMain !== main && (
                      <>
                        <button className="cat-action-btn edit" onClick={() => startEditMain(main)} title="重命名">✏️</button>
                        <button className="cat-action-btn delete" onClick={() => handleDeleteMain(main)} title="删除">🗑</button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="cat-sub-list">
                  {subs.map((sub) => {
                    const subPreset = isPresetCategory(activeType, main, sub)
                    const isEditingThis = editingSub?.main === main && editingSub?.oldName === sub

                    return (
                      <div key={sub} className="cat-row sub-row">
                        <span className="cat-sub-indent">└</span>

                        {isEditingThis ? (
                          <input
                            className="cat-edit-input inline"
                            value={editSubValue}
                            onChange={(e) => setEditSubValue(e.target.value)}
                            onBlur={saveEditSub}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditSub()
                              if (e.key === 'Escape') setEditingSub(null)
                            }}
                            autoFocus
                          />
                        ) : (
                          <span className="cat-name sub-name">{sub}</span>
                        )}

                        {subPreset ? (
                          <span className="cat-lock" title="预置分类，不可修改">🔒</span>
                        ) : (
                          <div className="cat-actions">
                            <button className="cat-action-btn edit" onClick={() => startEditSub(main, sub)} title="重命名">✏️</button>
                            <button className="cat-action-btn delete" onClick={() => handleDeleteSub(main, sub)} title="删除">🗑</button>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {addingSubTo === main ? (
                    <div className="cat-row sub-row add-sub-row">
                      <span className="cat-sub-indent">+</span>
                      <input
                        className="cat-edit-input inline"
                        placeholder="输入小类名称"
                        value={newSubValue}
                        onChange={(e) => setNewSubValue(e.target.value)}
                        onBlur={() => { if (!newSubValue.trim()) setAddingSubTo(null) }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddSub(main)
                          if (e.key === 'Escape') { setNewSubValue(''); setAddingSubTo(null) }
                        }}
                        autoFocus
                      />
                      <button className="cat-action-btn confirm" onClick={() => handleAddSub(main)}>✓</button>
                    </div>
                  ) : (
                    <button className="cat-add-sub-btn" onClick={() => { setAddingSubTo(main); setNewSubValue('') }}>
                      + 添加小类
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="cat-tip">
        💡 提示：带 🔒 的为系统预置分类，不可修改或删除。自定义分类可自由编辑、删除。
        删除分类时，该分类下的记录将自动迁移到默认分类。
      </div>
    </div>
  )
}
