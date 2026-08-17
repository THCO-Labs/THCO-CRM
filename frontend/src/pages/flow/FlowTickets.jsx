import { useEffect, useState } from "react";
import FlowShell from "./FlowShell";
import { flowAPI } from "../../lib/api";
import { Button } from "../../components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "../../components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../../components/ui/dropdown-menu";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  Loader2,
  Plus,
  X,
  MoreVertical,
  Pencil,
  Trash2,
  MoveRight,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";

const STATUSES = [
  { key: "queued", label: "Queued", color: "bg-gray-100 text-gray-600" },
  { key: "in_progress", label: "In Progress", color: "bg-blue-100 text-blue-700" },
  { key: "in_review", label: "In Review", color: "bg-amber-100 text-amber-700" },
  { key: "shipped", label: "Shipped", color: "bg-green-100 text-green-700" },
];

export default function FlowTickets() {
  const [tickets, setTickets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  // null = form closed; "new" = create; otherwise a ticket object to edit.
  const [editing, setEditing] = useState(null);
  const [activeTicket, setActiveTicket] = useState(null);
  // The ticket awaiting a delete confirmation, or null.
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = async () => {
    setLoading(true);
    const [t, p] = await Promise.all([flowAPI.listTickets(), flowAPI.listProjects()]);
    setTickets(t); setProjects(p);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const removeTicket = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await flowAPI.deleteTicket(confirmDelete.ticket_id);
      toast.success("Ticket deleted");
      setConfirmDelete(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not delete this ticket");
    } finally {
      setDeleting(false);
    }
  };

  const move = async (id, status) => {
    try { await flowAPI.updateTicketStatus(id, status); toast.success("Moved"); load(); }
    catch { toast.error("Failed"); }
  };

  const grouped = tickets.reduce((acc, t) => {
    (acc[t.status] = acc[t.status] || []).push(t);
    return acc;
  }, {});

  const onDragStart = ({ active }) => {
    setActiveTicket(tickets.find((t) => t.ticket_id === active.id) || null);
  };

  const onDragEnd = ({ active, over }) => {
    setActiveTicket(null);
    if (!over) return;
    const ticket = tickets.find((t) => t.ticket_id === active.id);
    if (!ticket) return;

    // Resolve the target status whether the pointer is over an empty column
    // (a "column" droppable) or over another ticket inside that column.
    const target =
      over.data.current?.type === "column"
        ? over.data.current.status
        : over.data.current?.type === "ticket"
          ? over.data.current.status
          : null;

    if (target && target !== ticket.status) move(ticket.ticket_id, target);
  };

  return (
    <FlowShell
      title="Engineering tickets"
      action={
        <Button onClick={() => setEditing("new")} className="bg-[#1B4332] text-white" data-testid="tickets-new-btn">
          <Plus className="w-4 h-4 mr-1.5" />New Ticket
        </Button>
      }
    >
      {loading ? <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#1B4332]" /></div> : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="overflow-x-auto">
            <div className="flex gap-3 min-w-min" data-testid="tickets-board">
              {STATUSES.map((s) => (
                <StatusColumn
                  key={s.key}
                  status={s}
                  tickets={grouped[s.key] || []}
                  onEdit={(t) => setEditing(t)}
                  onDelete={(t) => setConfirmDelete(t)}
                  onMove={move}
                />
              ))}
            </div>
          </div>
          <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18,0.67,0.6,1.22)" }}>
            {activeTicket ? <TicketOverlay ticket={activeTicket} /> : null}
          </DragOverlay>
        </DndContext>
      )}
      {editing !== null && (
        <TicketForm
          projects={projects}
          ticket={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {/* Asked before, not after. Deleting a ticket cannot be undone, and the
          menu item sits next to the one that merely opens it for editing. */}
      <AlertDialog open={Boolean(confirmDelete)} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent className="bg-white border-[#EAE7E0] text-gray-900">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-gray-900">{confirmDelete?.title}</span> will be
              removed from the board. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); removeTicket(); }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="ticket-delete-confirm"
            >
              {deleting ? "Deleting..." : "Delete ticket"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FlowShell>
  );
}

// One of the four fixed kanban columns. Its whole body is a drop target, so a
// dragged ticket can be released on an empty column just as easily as on top
// of another card.
const StatusColumn = ({ status, tickets, onEdit, onDelete, onMove }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: status.key,
    data: { type: "column", status: status.key },
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-w-[280px] w-[280px] rounded-xl p-3 transition-colors ${
        isOver ? "bg-[#1B4332]/10 ring-2 ring-[#1B4332]/30" : "bg-gray-50"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">{status.label}</h3>
        <span className="text-xs bg-white px-2 py-0.5 rounded-full border">{tickets.length}</span>
      </div>
      <div className="space-y-2 max-h-[600px] overflow-y-auto min-h-[80px]">
        {tickets.map((t) => (
          <DraggableTicketCard key={t.ticket_id} ticket={t} onEdit={onEdit} onDelete={onDelete} onMove={onMove} />
        ))}
      </div>
    </div>
  );
};

const DraggableTicketCard = ({ ticket, onEdit, onDelete, onMove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useDraggable({
    id: ticket.ticket_id,
    data: { type: "ticket", ticket_id: ticket.ticket_id, status: ticket.status },
  });

  const style = { transform: CSS.Translate.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg p-3 border border-gray-100 shadow-sm ${isDragging ? "opacity-40" : ""}`}
      data-testid={`ticket-${ticket.ticket_id}`}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle only, so clicks on the title/menu never start a drag. */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500"
          aria-label="Drag to move ticket"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900">{ticket.title}</p>
          {ticket.acceptance_criteria && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ticket.acceptance_criteria}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-100 rounded">{ticket.estimated_effort}</span>
            {ticket.assigned_engineer_name && (
              <span className="text-[10px] text-gray-500">{ticket.assigned_engineer_name}</span>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="shrink-0 p-1 -mr-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              data-testid={`ticket-menu-${ticket.ticket_id}`}
              aria-label="Ticket actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 bg-white">
            {/* Offered only where the server would allow it -- whoever raised
                the ticket, the manager of its project, or an administrator.
                `_can_manage` is that same verdict, sent with the ticket. */}
            {ticket._can_manage && (
              <>
                <DropdownMenuItem onClick={() => onEdit(ticket)} data-testid={`ticket-edit-${ticket.ticket_id}`}>
                  <Pencil className="w-4 h-4 mr-2" />Edit ticket
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(ticket)}
                  className="text-red-600 focus:text-red-600"
                  data-testid={`ticket-delete-${ticket.ticket_id}`}
                >
                  <Trash2 className="w-4 h-4 mr-2" />Delete ticket
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {STATUSES.filter((x) => x.key !== ticket.status).map((x) => (
              <DropdownMenuItem key={x.key} onClick={() => onMove(ticket.ticket_id, x.key)}>
                <MoveRight className="w-4 h-4 mr-2" />Move to {x.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

// Elevated preview shown while dragging; the source card stays in place as a
// faded placeholder.
const TicketOverlay = ({ ticket }) => (
  <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-lg rotate-1 cursor-grabbing w-[248px]">
    <p className="font-medium text-sm text-gray-900">{ticket.title}</p>
    <div className="flex items-center gap-2 mt-2">
      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-100 rounded">{ticket.estimated_effort}</span>
      {ticket.assigned_engineer_name && (
        <span className="text-[10px] text-gray-500">{ticket.assigned_engineer_name}</span>
      )}
    </div>
  </div>
);

const TicketForm = ({ projects, ticket, onClose, onSaved }) => {
  const isEdit = Boolean(ticket);
  const [f, setF] = useState({
    project_id: ticket?.project_id || "",
    title: ticket?.title || "",
    acceptance_criteria: ticket?.acceptance_criteria || "",
    estimated_effort: ticket?.estimated_effort || "M",
  });
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (!f.project_id || !f.title.trim()) { toast.error("Project + title required"); return; }
    setSaving(true);
    try {
      if (isEdit) { await flowAPI.updateTicket(ticket.ticket_id, f); toast.success("Ticket updated"); }
      else { await flowAPI.createTicket(f); toast.success("Ticket created"); }
      onSaved();
    } catch {
      toast.error(isEdit ? "Failed to update" : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <form onSubmit={save} className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">{isEdit ? "Edit Ticket" : "New Ticket"}</h3>
          <button type="button" onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Project *</label>
          <select value={f.project_id} onChange={(e) => setF({...f, project_id: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" data-testid="tk-project">
            <option value="">— select project —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.client_name_snapshot})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
          <input value={f.title} onChange={(e) => setF({...f, title: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" data-testid="tk-title" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Acceptance Criteria</label>
          <textarea rows={3} value={f.acceptance_criteria} onChange={(e) => setF({...f, acceptance_criteria: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Effort</label>
          <select value={f.estimated_effort} onChange={(e) => setF({...f, estimated_effort: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="S">S (small)</option><option value="M">M (medium)</option><option value="L">L (large)</option>
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving} className="bg-[#1B4332] text-white" data-testid="tk-save">
            {isEdit ? "Save changes" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
};
