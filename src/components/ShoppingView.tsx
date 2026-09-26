import React, { useState } from 'react';
import { ShoppingItem, ChecklistItem } from '../types';
import { api } from '../api/client';
import { Plus, ShoppingCart, Trash2, Edit3, Eye, X, Image as ImageIcon, Check } from 'lucide-react';

interface ShoppingViewProps {
  shoppingItems: ShoppingItem[];
  onRefresh: () => void;
  onOpenQuickAdd: () => void;
}

export const ShoppingView: React.FC<ShoppingViewProps> = ({ shoppingItems, onRefresh }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<ShoppingItem | null>(null);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Form state matching IMG_9238.png
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('$ USD');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState('Medium');
  const [linkToGoal, setLinkToGoal] = useState('');
  const [linkToProject, setLinkToProject] = useState('');
  const [links, setLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState('');
  const [image, setImage] = useState('');
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState<Array<{ title: string; completed: boolean }>>([]);

  const handleOpenAdd = () => {
    setName('');
    setCurrency('$ USD');
    setPrice('');
    setQuantity('1');
    setCategory('General');
    setPriority('Medium');
    setLinkToGoal('');
    setLinkToProject('');
    setLinks([]);
    setNewLink('');
    setImage('');
    setNotes('');
    setChecklist([]);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (item: ShoppingItem) => {
    setEditingItem(item);
    setName(item.name);
    setCurrency('$ USD');
    setPrice(item.price !== null && item.price !== undefined ? String(item.price) : '');
    setQuantity(item.quantity || '1');
    setCategory(item.category || 'General');
    setPriority('Medium');
    setLinkToGoal('');
    setLinkToProject('');
    setLinks([]);
    setNewLink('');
    setImage(item.image || '');
    setNotes(item.notes || '');
    setChecklist(item.checklist ? item.checklist.map(c => ({ title: c.title, completed: c.completed })) : []);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const formattedChecklist = checklist.map((c, i) => ({
        id: editingItem?.checklist?.[i]?.id || 'chk_' + Math.random().toString(36).substring(2, 9),
        title: c.title,
        completed: c.completed
      }));

      const payload = {
        name,
        quantity,
        price: price ? parseFloat(price) : null,
        category,
        notes,
        image: image || null,
        checklist: formattedChecklist
      };

      if (editingItem) {
        await api.updateShoppingItem(editingItem.id, payload);
        setEditingItem(null);
      } else {
        await api.createShoppingItem(payload);
        setIsAddOpen(false);
      }
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePurchased = async (id: string) => {
    try {
      await api.toggleShoppingPurchased(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleChecklistItem = async (itemId: string, checkId: string) => {
    try {
      await api.toggleShoppingChecklist(itemId, checkId);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteImage = async (id: string) => {
    if (!confirm('Remove attached image from this item?')) return;
    try {
      await api.deleteShoppingImage(id);
      onRefresh();
      if (viewingItem?.id === id) {
        setViewingItem({ ...viewingItem, image: undefined });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shopping item?')) return;
    try {
      await api.deleteShoppingItem(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Shopping</h1>
          <p className="text-gray-400 text-sm">Track purchases, prices, specs, and shopping checklists</p>
        </div>
        <button
          onClick={onOpenQuickAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Add Item</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shoppingItems.length === 0 ? (
          <div className="col-span-full bg-[#12141C] border border-[#2A2E3D] rounded-2xl p-12 text-center space-y-3">
            <ShoppingCart className="w-12 h-12 text-indigo-500 mx-auto opacity-50" />
            <h3 className="text-white font-medium text-lg">Your shopping list is empty</h3>
            <p className="text-gray-400 text-sm">Add items you plan to buy.</p>
            <button
              onClick={onOpenQuickAdd}
              className="px-4 py-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl text-sm font-medium hover:bg-indigo-600/30 transition-all inline-block mt-2"
            >
              Add Shopping Item
            </button>
          </div>
        ) : (
          shoppingItems.map((item) => {
            const checklistItems = item.checklist || [];
            const completedCount = checklistItems.filter(c => c.completed).length;
            const totalCount = checklistItems.length;
            const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : item.purchased ? 100 : 0;

            return (
              <div
                key={item.id}
                onClick={() => setViewingItem(item)}
                className="bg-[#12141C] border border-[#2A2E3D] rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-indigo-500/40 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  {/* Bought checkbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePurchased(item.id);
                    }}
                    className={`mt-1 w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                      item.purchased
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-[#2A2E3D] bg-[#1A1D29] hover:border-indigo-500'
                    }`}
                  >
                    {item.purchased && <Check className="w-4 h-4" />}
                  </button>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className={`text-white font-semibold text-base ${item.purchased ? 'line-through text-gray-500' : ''}`}>
                          {item.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {item.price !== null && item.price !== undefined && (
                            <span className="text-indigo-400 font-semibold text-sm">
                              ₦{item.price.toLocaleString()}
                            </span>
                          )}
                          <span className="text-xs text-gray-400 bg-[#1A1D29] px-2 py-0.5 rounded-md border border-[#2A2E3D]">
                            Qty: {item.quantity || 1}
                          </span>
                          <span className="text-xs text-gray-400 bg-[#1A1D29] px-2 py-0.5 rounded-md border border-[#2A2E3D]">
                            {item.category || 'General'}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                            item.purchased ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {item.purchased ? 'Bought' : 'Not Bought'}
                          </span>
                        </div>
                      </div>

                      {/* Image Thumbnail */}
                      {item.image && (
                        <div className="relative group/img flex-shrink-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImageUrl(item.image!);
                            }}
                            className="w-14 h-14 rounded-xl object-cover border border-[#2A2E3D] hover:border-indigo-500 cursor-pointer transition-all"
                          />
                        </div>
                      )}
                    </div>

                    {item.notes && (
                      <p className="text-gray-400 text-sm line-clamp-2">{item.notes}</p>
                    )}

                    {/* Action checklist preview */}
                    {totalCount > 0 && (
                      <div className="space-y-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>{completedCount}/{totalCount} actions completed</span>
                          <span className="text-indigo-400 font-medium">{progressPct}%</span>
                        </div>
                        <div className="w-full bg-[#1A1D29] rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <div className="space-y-1 pt-1">
                          {checklistItems.slice(0, 2).map((chk) => (
                            <div key={chk.id} className="flex items-center gap-2 text-xs text-gray-300">
                              <input
                                type="checkbox"
                                checked={chk.completed}
                                onChange={() => handleToggleChecklistItem(item.id, chk.id)}
                                className="w-3.5 h-3.5 rounded border-[#2A2E3D] bg-[#1A1D29] text-indigo-600 focus:ring-0"
                              />
                              <span className={chk.completed ? 'line-through text-gray-500' : ''}>{chk.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* View, Edit, Delete */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2A2E3D]" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setViewingItem(item)}
                    title="View Item"
                    className="p-2 rounded-xl bg-[#1A1D29] border border-[#2A2E3D] text-gray-300 hover:text-white hover:border-indigo-500/50 transition-all flex items-center gap-1.5 text-xs px-3"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                  <button
                    onClick={() => handleOpenEdit(item)}
                    title="Edit Item"
                    className="p-2 rounded-xl bg-[#1A1D29] border border-[#2A2E3D] text-gray-300 hover:text-white hover:border-indigo-500/50 transition-all flex items-center gap-1.5 text-xs px-3"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    title="Delete Item"
                    className="p-2 rounded-xl bg-[#1A1D29] border border-[#2A2E3D] text-gray-400 hover:text-red-400 hover:border-red-500/50 transition-all flex items-center gap-1.5 text-xs px-3"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Shopping Item Modal matching IMG_9238.png */}
      {(isAddOpen || editingItem) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#12141C] border border-[#2A2E3D] rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingItem ? 'Edit Shopping Item' : 'Add Shopping Item'}
              </h2>
              <button
                onClick={() => { setIsAddOpen(false); setEditingItem(null); }}
                className="text-gray-400 hover:text-white p-1 rounded-lg bg-[#1A1D29] border border-[#2A2E3D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ergonomic Desk Chair, Wireless Keyboard"
                  className="w-full bg-[#1A1D29] border border-[#2A2E3D] rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Price & Currency and Quantity matching IMG_9238.png */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Price & Currency</label>
                  <div className="flex gap-2">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="bg-[#1A1D29] border border-[#2A2E3D] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value="₦ NGN">₦ NGN</option>
                      <option value="$ USD">$ USD</option>
                      <option value="€ EUR">€ EUR</option>
                    </select>
                    <input
                      type="number"
                      step="any"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="e.g. 85000"
                      className="flex-1 bg-[#1A1D29] border border-[#2A2E3D] rounded-xl px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Quantity</label>
                  <input
                    type="text"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="1"
                    className="w-full bg-[#1A1D29] border border-[#2A2E3D] rounded-xl px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 text-center"
                  />
                </div>
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#1A1D29] border border-[#2A2E3D] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="General">General</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Office & Tech">Office & Tech</option>
                    <option value="Home & Living">Home & Living</option>
                    <option value="Clothing">Clothing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-[#1A1D29] border border-[#2A2E3D] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              {/* Photos, Receipts & Files */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Photos, Receipts & Files</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A1D29] border border-[#2A2E3D] text-indigo-400 hover:text-indigo-300 hover:border-indigo-500/50 cursor-pointer text-sm font-medium transition-all">
                    <ImageIcon className="w-4 h-4" />
                    <span>Add Image File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  {image && (
                    <span className="text-xs text-emerald-400 font-medium">Image attached</span>
                  )}
                </div>
                {image && (
                  <div className="mt-3 flex items-center gap-3 bg-[#1A1D29] p-3 rounded-xl border border-[#2A2E3D]">
                    <img 
                      src={image} 
                      alt="Preview" 
                      onClick={() => setPreviewImageUrl(image)}
                      className="w-14 h-14 rounded-lg object-cover cursor-pointer border border-[#2A2E3D] hover:border-indigo-500" 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300 font-medium truncate">Attached photo preview</p>
                      <p className="text-[10px] text-gray-500">Click image to preview fullscreen</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImage('')}
                      className="text-xs text-gray-300 hover:text-white px-3 py-1.5 rounded-lg bg-[#2A2E3D] hover:bg-[#323748] border border-[#3A3F52] transition-all"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Notes & Specifications matching IMG_9238.png */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Notes & Specifications</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Color, dimensions, store details..."
                  rows={3}
                  className="w-full bg-[#1A1D29] border border-[#2A2E3D] rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Actions / Checklist matching IMG_9242.png */}
              <div className="bg-[#12141C] border border-[#2A2E3D] rounded-2xl p-4 space-y-3">
                <h3 className="text-white font-semibold text-sm">Actions</h3>
                <div className="space-y-3">
                  {checklist.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={(e) => {
                          const updated = [...checklist];
                          updated[index].completed = e.target.checked;
                          setChecklist(updated);
                        }}
                        className="w-5 h-5 rounded border-[#2A2E3D] bg-[#1A1D29] text-indigo-600 focus:ring-0"
                      />
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => {
                          const updated = [...checklist];
                          updated[index].title = e.target.value;
                          setChecklist(updated);
                        }}
                        placeholder="Action title..."
                        className="flex-1 bg-transparent border-b border-[#2A2E3D] text-white py-1 px-1 focus:outline-none focus:border-indigo-500 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setChecklist(checklist.filter((_, i) => i !== index))}
                        className="text-gray-400 hover:text-red-400 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setChecklist([...checklist, { title: '', completed: false }])}
                  className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center gap-1 mt-2"
                >
                  + Add Action
                </button>
              </div>

              {/* Modal Buttons matching IMG_9238.png bottom */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setIsAddOpen(false); setEditingItem(null); }}
                  className="flex-1 bg-[#1A1D29] border border-[#2A2E3D] text-gray-300 hover:text-white py-3 rounded-xl font-medium text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-3 rounded-xl font-medium text-sm shadow-lg shadow-indigo-500/20 transition-all"
                >
                  {editingItem ? 'Save Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Shopping Item Modal */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#12141C] border border-[#2A2E3D] rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                  viewingItem.purchased ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {viewingItem.purchased ? 'Bought' : 'Not Bought'}
                </span>
                <span className="text-xs text-gray-400 bg-[#1A1D29] px-2.5 py-0.5 rounded-md border border-[#2A2E3D]">
                  {viewingItem.category || 'General'}
                </span>
              </div>
              <button
                onClick={() => setViewingItem(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg bg-[#1A1D29] border border-[#2A2E3D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{viewingItem.name}</h2>
              {viewingItem.price !== null && viewingItem.price !== undefined && (
                <p className="text-indigo-400 font-bold text-lg mb-2">₦{viewingItem.price.toLocaleString()}</p>
              )}
              <p className="text-gray-300 text-sm whitespace-pre-wrap">
                {viewingItem.notes || 'No notes provided.'}
              </p>
            </div>

            {/* Image Preview & Delete option */}
            {viewingItem.image && (
              <div className="space-y-2 bg-[#1A1D29] p-3 rounded-2xl border border-[#2A2E3D]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Attached Image</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreviewImageUrl(viewingItem.image!)}
                      className="px-3 py-1 rounded-lg bg-indigo-600/20 text-indigo-400 text-xs font-medium hover:bg-indigo-600/30 transition-all"
                    >
                      View Full
                    </button>
                    <button
                      onClick={() => handleDeleteImage(viewingItem.id)}
                      className="px-3 py-1 rounded-lg bg-red-600/20 text-red-400 text-xs font-medium hover:bg-red-600/30 transition-all"
                    >
                      Delete Image
                    </button>
                  </div>
                </div>
                <img
                  src={viewingItem.image}
                  alt={viewingItem.name}
                  className="w-full h-48 rounded-xl object-cover border border-[#2A2E3D]"
                />
              </div>
            )}

            {/* Checklist in view */}
            {viewingItem.checklist && viewingItem.checklist.length > 0 && (
              <div className="space-y-3 bg-[#1A1D29] p-4 rounded-2xl border border-[#2A2E3D]">
                <h3 className="text-white font-semibold text-sm">Action Checklist</h3>
                <div className="space-y-2">
                  {viewingItem.checklist.map((item) => (
                    <div key={item.id} className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => {
                          handleToggleChecklistItem(viewingItem.id, item.id);
                          setViewingItem({
                            ...viewingItem,
                            checklist: viewingItem.checklist.map(c => c.id === item.id ? { ...c, completed: !c.completed } : c)
                          });
                        }}
                        className="w-4 h-4 rounded border-[#2A2E3D] bg-[#12141C] text-indigo-600 focus:ring-0"
                      />
                      <span className={`text-sm ${item.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                        {item.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  const item = viewingItem;
                  setViewingItem(null);
                  handleOpenEdit(item);
                }}
                className="flex-1 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Item</span>
              </button>
              <button
                onClick={() => setViewingItem(null)}
                className="flex-1 bg-[#1A1D29] border border-[#2A2E3D] text-gray-300 hover:text-white py-2.5 rounded-xl font-medium text-sm transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Preview Modal */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-4 right-4 text-white bg-black/60 hover:bg-black/80 p-2 rounded-full border border-white/20 transition-all z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewImageUrl}
              alt="Fullscreen preview"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain border border-[#2A2E3D]"
            />
          </div>
        </div>
      )}
    </div>
  );
};
