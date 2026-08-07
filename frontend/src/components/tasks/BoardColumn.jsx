import { useSortable } from "@dnd-kit/sortable";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useState } from "react";
import EditableTitle from "./EditableTitle";
import BoardMenu from "./BoardMenu";
import TaskCard from "./TaskCard";
import AddTask from "./AddTask";
import TaskCardEditor from "./TaskCardEditor";
import TaskDetail from "./TaskDetail";
import { READ_ONLY_PERMISSIONS } from "./permissions";

/**
 * A single Trello "list" / column. Horizontally sortable (reorder boards)
 * and hosts a vertical sortable list of cards.
 *
 * Board reordering uses the column header as the drag handle, while cards
 * inside use their own grips (registered under this column's id).
 */
export default function BoardColumn({
  board,
  permissions = READ_ONLY_PERMISSIONS,
  onRenameBoard,
  onDeleteBoard,
  onRenameCard,
  onEditCard,
  onDeleteCard,
  onAddCard,
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [renamingCardId, setRenamingCardId] = useState(null);
  const [editorCard, setEditorCard] = useState(null);
  const [viewCard, setViewCard] = useState(null);

  const { setNodeRef: setColumnRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({ id: board.board_id, data: { type: "board", boardId: board.board_id }, disabled: !permissions.manageBoards });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const cardIds = (board.cards || []).map((c) => c.card_id);
  const renamingCard = (board.cards || []).find((c) => c.card_id === renamingCardId);

  return (
    <div
      ref={setColumnRef}
      style={style}
      className={`shrink-0 w-[280px] max-h-full flex flex-col rounded-xl bg-[#F0EEE9]/80 border border-[#EAE7E0] ${
        isDragging ? "opacity-60" : ""
      }`}
      data-testid={`board-column-${board.board_id}`}
    >
      {/* Header: drag handle + title + count + menu */}
      <div className="flex items-center gap-1 px-2.5 pt-2.5 pb-2">
        {permissions.manageBoards && (
          <button
            aria-label="Drag board"
            className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none rounded p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B]/40"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}

        {editingTitle ? (
          <EditableTitle
            value={board.title}
            startEditing
            testId={`board-title-${board.board_id}`}
            onCommit={(t) => {
              onRenameBoard(board.board_id, t);
              setEditingTitle(false);
            }}
          />
        ) : (
          <button
            onClick={() => permissions.manageBoards && setEditingTitle(true)}
            data-testid={`board-title-${board.board_id}`}
            className={`flex-1 text-left text-sm font-semibold text-gray-900 ${
              permissions.manageBoards ? "hover:text-[#8F7340] cursor-pointer" : "cursor-default"
            } truncate px-2 py-0.5 rounded transition-colors`}
          >
            {board.title}
          </button>
        )}

        <span className="text-[11px] font-medium text-gray-500 bg-white border border-gray-200 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
          {cardIds.length}
        </span>
        {permissions.manageBoards && (
          <BoardMenu
            onRename={() => setEditingTitle(true)}
            onDelete={() => onDeleteBoard(board.board_id)}
          />
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-2 pb-1 [scrollbar-width:thin]" data-testid={`board-cards-${board.board_id}`}>
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {(board.cards || []).map((card) => (
              <TaskCard
                key={card.card_id}
                card={renamingCardId === card.card_id ? { ...card, _renaming: true } : card}
                boardId={board.board_id}
                permissions={permissions}
                onRename={() => permissions.editTasks && setRenamingCardId(card.card_id)}
                onView={(c) => setViewCard(c)}
                onEdit={(c) => setEditorCard(c)}
                onDelete={onDeleteCard}
              />
            ))}
          </div>
        </SortableContext>

        {/* Inline rename of a card title */}
        {renamingCard && (
          <div className="mt-2 p-2 bg-white rounded-lg border border-[#C6A15B] shadow-sm">
            <EditableTitle
              value={renamingCard.title}
              onCommit={(t) => {
                onRenameCard(renamingCard.card_id, t);
                setRenamingCardId(null);
              }}
              className="w-full text-sm font-medium"
            />
            <p className="text-[10px] text-gray-400 mt-1 px-2">Enter to save · Esc to cancel</p>
          </div>
        )}

        {/* Empty state for a board with no cards */}
        {cardIds.length === 0 && !renamingCard && (
          <p className="text-xs text-gray-400 italic text-center py-5" data-testid={`board-empty-${board.board_id}`}>
            No tasks yet.
          </p>
        )}
      </div>

      {/* Add task */}
      {permissions.createTasks && (
        <div className="px-2 pb-2.5">
          <AddTask onCreate={(title) => onAddCard(board.board_id, { title })} />
        </div>
      )}

      {/* Editor modal */}
      <TaskCardEditor
        card={editorCard}
        open={!!editorCard}
        onClose={() => setEditorCard(null)}
        onSave={onEditCard}
        permissions={permissions}
      />

      {/* Task detail popup */}
      <TaskDetail
        card={viewCard}
        onClose={() => setViewCard(null)}
      />
    </div>
  );
}
