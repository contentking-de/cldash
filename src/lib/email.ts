import { resend, fromEmail } from "@/lib/resend";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export async function sendTaskAssignedEmail({
  assigneeEmail,
  assigneeName,
  taskTitle,
  taskId,
  assignedByName,
}: {
  assigneeEmail: string;
  assigneeName: string | null;
  taskTitle: string;
  taskId: string;
  assignedByName: string;
}) {
  await resend.emails.send({
    from: fromEmail,
    to: assigneeEmail,
    subject: `Neuer Task: ${taskTitle}`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0;">clever.legal</h1>
        </div>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
          <p style="color: #334155; font-size: 15px; margin: 0 0 8px;">
            Hallo ${assigneeName || ""},
          </p>
          <p style="color: #64748b; font-size: 14px; margin: 0 0 20px;">
            <strong>${assignedByName}</strong> hat dir einen neuen Task zugewiesen:
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="font-size: 15px; font-weight: 600; color: #0f172a; margin: 0;">${taskTitle}</p>
          </div>
          <a href="${baseUrl}/tasks" style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 24px; border-radius: 8px;">
            Task ansehen
          </a>
        </div>
      </div>
    `,
  });
}

const statusLabels: Record<string, string> = {
  BACKLOG: "Backlog",
  TODO: "To Do",
  IN_PROGRESS: "In Arbeit",
  REVIEW: "Review",
  DONE: "Erledigt",
};

export async function sendTaskStatusChangedEmail({
  assigneeEmail,
  assigneeName,
  taskTitle,
  oldStatus,
  newStatus,
  changedByName,
}: {
  assigneeEmail: string;
  assigneeName: string | null;
  taskTitle: string;
  oldStatus: string;
  newStatus: string;
  changedByName: string;
}) {
  const oldLabel = statusLabels[oldStatus] || oldStatus;
  const newLabel = statusLabels[newStatus] || newStatus;

  await resend.emails.send({
    from: fromEmail,
    to: assigneeEmail,
    subject: `Task-Status geändert: ${taskTitle}`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0;">clever.legal</h1>
        </div>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
          <p style="color: #334155; font-size: 15px; margin: 0 0 8px;">
            Hallo ${assigneeName || ""},
          </p>
          <p style="color: #64748b; font-size: 14px; margin: 0 0 20px;">
            <strong>${changedByName}</strong> hat den Status deines Tasks geändert:
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="font-size: 15px; font-weight: 600; color: #0f172a; margin: 0 0 12px;">${taskTitle}</p>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="background: #f1f5f9; color: #64748b; font-size: 13px; font-weight: 500; padding: 4px 10px; border-radius: 6px; text-decoration: line-through;">${oldLabel}</span>
              <span style="color: #94a3b8; font-size: 13px;">→</span>
              <span style="background: #dbeafe; color: #2563eb; font-size: 13px; font-weight: 600; padding: 4px 10px; border-radius: 6px;">${newLabel}</span>
            </div>
          </div>
          <a href="${baseUrl}/tasks" style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 24px; border-radius: 8px;">
            Task ansehen
          </a>
        </div>
      </div>
    `,
  });
}

export async function sendTaskCommentEmail({
  assigneeEmail,
  assigneeName,
  taskTitle,
  commentAuthor,
  commentContent,
}: {
  assigneeEmail: string;
  assigneeName: string | null;
  taskTitle: string;
  commentAuthor: string;
  commentContent: string;
}) {
  await resend.emails.send({
    from: fromEmail,
    to: assigneeEmail,
    subject: `Neuer Kommentar: ${taskTitle}`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0;">clever.legal</h1>
        </div>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
          <p style="color: #334155; font-size: 15px; margin: 0 0 8px;">
            Hallo ${assigneeName || ""},
          </p>
          <p style="color: #64748b; font-size: 14px; margin: 0 0 20px;">
            <strong>${commentAuthor}</strong> hat einen Kommentar zu deinem Task hinterlassen:
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
            <p style="font-size: 13px; font-weight: 600; color: #64748b; margin: 0 0 4px;">${taskTitle}</p>
            <p style="font-size: 14px; color: #334155; margin: 0;">${commentContent}</p>
          </div>
          <a href="${baseUrl}/tasks" style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 24px; border-radius: 8px;">
            Task ansehen
          </a>
        </div>
      </div>
    `,
  });
}

export async function sendTaskMentionEmail({
  recipientEmail,
  recipientName,
  taskTitle,
  commentAuthor,
  commentContent,
}: {
  recipientEmail: string;
  recipientName: string | null;
  taskTitle: string;
  commentAuthor: string;
  commentContent: string;
}) {
  await resend.emails.send({
    from: fromEmail,
    to: recipientEmail,
    subject: `Du wurdest erwähnt: ${taskTitle}`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0;">clever.legal</h1>
        </div>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
          <p style="color: #334155; font-size: 15px; margin: 0 0 8px;">
            Hallo ${recipientName || ""},
          </p>
          <p style="color: #64748b; font-size: 14px; margin: 0 0 20px;">
            <strong>${commentAuthor}</strong> hat dich in einem Kommentar erwähnt:
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
            <p style="font-size: 13px; font-weight: 600; color: #64748b; margin: 0 0 4px;">${taskTitle}</p>
            <p style="font-size: 14px; color: #334155; margin: 0;">${commentContent}</p>
          </div>
          <a href="${baseUrl}/tasks" style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 24px; border-radius: 8px;">
            Task ansehen
          </a>
        </div>
      </div>
    `,
  });
}

export async function sendTicketCommentEmail({
  assigneeEmail,
  assigneeName,
  ticketTitle,
  ticketId,
  commentAuthor,
  commentContent,
}: {
  assigneeEmail: string;
  assigneeName: string | null;
  ticketTitle: string;
  ticketId: string;
  commentAuthor: string;
  commentContent: string;
}) {
  await resend.emails.send({
    from: fromEmail,
    to: assigneeEmail,
    subject: `Neuer Kommentar: ${ticketTitle}`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0;">clever.legal</h1>
        </div>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
          <p style="color: #334155; font-size: 15px; margin: 0 0 8px;">
            Hallo ${assigneeName || ""},
          </p>
          <p style="color: #64748b; font-size: 14px; margin: 0 0 20px;">
            <strong>${commentAuthor}</strong> hat einen Kommentar zu einem Ticket hinterlassen:
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
            <p style="font-size: 13px; font-weight: 600; color: #64748b; margin: 0 0 4px;">${ticketTitle}</p>
            <p style="font-size: 14px; color: #334155; margin: 0;">${commentContent}</p>
          </div>
          <a href="${baseUrl}/tickets/${ticketId}" style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 24px; border-radius: 8px;">
            Ticket ansehen
          </a>
        </div>
      </div>
    `,
  });
}
