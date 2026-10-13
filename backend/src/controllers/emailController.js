const createSmtpClient = require("../config/email");
const { downloadJson, uploadJson } = require("../config/storage");
const { getSession } = require("./authcontrollers");
const createImapClient = require("../config/imap");
const ExcelJS = require("exceljs");

// ======================================================
// RECIPIENT FILE HELPERS
// ======================================================

// ======================================================
// RECIPIENT STORAGE HELPERS
// ======================================================

const recipientsFile = "recipients.json";

const getRecipientsData = async () => {
  return await downloadJson(recipientsFile, {});
};

const saveRecipientsData = async (recipientsData) => {
  await uploadJson(recipientsFile, recipientsData);
};

// ======================================================
// SESSION HELPER
// ======================================================

const getUserSession = async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    res.status(401).json({
      success: false,
      message: "Login session is required",
    });

    return null;
  }

  const session = await getSession(sessionId);

  if (!session) {
    res.status(401).json({
      success: false,
      message: "Session expired. Please login again.",
    });

    return null;
  }

  return session;
};

// ======================================================
// TEST EMAIL
// ======================================================

const sendTestEmail = async (req, res) => {
  try {
    const { to, firstName, sessionId } = req.body;

    if (!to || !firstName) {
      return res.status(400).json({
        success: false,
        message: "Email and firstName are required",
      });
    }

    const session = await getSession(sessionId);

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }

    const smtpClient = await createSmtpClient(session.email, session.password);

    const subject = "Are travelers calling when your team is unavailable?";

    const body = `Hi ${firstName},

How much time does your team spend answering the same questions about packages, availability, prices, and booking status?

Finovo Global can build an AI chatbot for your travel agency that responds to customers around the clock, collects their travel requirements, and guides them through booking enquiries.

Would you be open to a 15-minute call next week to discuss where an AI assistant could fit into your current booking process?

Best regards,

Roman

Business Development Manager

Finovo Global

Call / WhatsApp: +966 53 756 5438

Riyadh, Saudi Arabia

<a href="https://finovoglobal.com" target="_blank">
Visit Our Website
</a>

<a href="https://finovoglobal.com" target="_blank">
<img
  src="https://finovoglobal.com/public/assets/imgs/finallogoblack.png"
  width="220"
  alt="Finovo Global"
/>
</a>
`;

    const message = {
      text: body,
      from: session.email,
      to,
      subject,
    };

    await new Promise((resolve, reject) => {
      smtpClient.send(message, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    return res.status(200).json({
      success: true,
      message: `Email sent successfully to ${to}`,
    });
  } catch (error) {
    console.error("Email error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send email",
      error: error.message,
    });
  }
};

// ======================================================
// SAVE EMAIL TO SENT FOLDER
// ======================================================

const saveToSent = async (message, email, password, attachments = []) => {
  const client = createImapClient(email, password);

  try {
    await client.connect();

    const mailboxes = await client.list();

    const sentFolder = mailboxes.find((mailbox) => {
      const name = mailbox.name.toLowerCase();

      return (
        name === "sent" ||
        name.includes("sent items") ||
        name.includes("sent messages")
      );
    });

    if (!sentFolder) {
      console.log(`Sent folder not found for ${email}`);
      return false;
    }

    const mixedBoundary = `mixed_${Date.now()}_${Math.random()
      .toString(16)
      .slice(2)}`;

    const altBoundary = `alt_${Date.now()}_${Math.random()
      .toString(16)
      .slice(2)}`;

    const encodeHeader = (value = "") => String(value).replace(/[\r\n]+/g, " ");

    const escapeHtml = (value = "") =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const base64Lines = (value) => {
      const encoded = Buffer.from(value).toString("base64");
      return encoded.match(/.{1,76}/g)?.join("\r\n") || "";
    };

    const headers = [
      `From: ${encodeHeader(message.from)}`,
      `To: ${encodeHeader(message.to)}`,
      ...(message.cc ? [`Cc: ${encodeHeader(message.cc)}`] : []),
      `Subject: ${encodeHeader(message.subject)}`,
      `Date: ${new Date().toUTCString()}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    ];

    const html = message.html || "";
    const text = message.text || "";

    const parts = [
      `--${mixedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      "",
      `--${altBoundary}`,
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      base64Lines(text),
      `--${altBoundary}`,
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      base64Lines(html),
      `--${altBoundary}--`,
    ];

    for (const file of attachments) {
      const safeName = encodeHeader(file.name || "attachment").replace(
        /["\\]/g,
        "_",
      );

      parts.push(
        `--${mixedBoundary}`,
        `Content-Type: ${
          file.type || "application/octet-stream"
        }; name="${safeName}"`,
        "Content-Transfer-Encoding: base64",
        `Content-Disposition: attachment; filename="${safeName}"`,
        "",
        base64Lines(file.data),
      );
    }

    parts.push(`--${mixedBoundary}--`);

    const messageSource = [...headers, "", parts.join("\r\n")].join("\r\n");

    await client.append(
      sentFolder.path,
      Buffer.from(messageSource, "utf8"),
      ["\\Seen"],
      new Date(),
    );

    console.log(`Saved email to Sent: ${message.to}`);

    return true;
  } catch (error) {
    console.error(`Could not save to Sent for ${email}:`, error.message);

    return false;
  } finally {
    await client.logout().catch(() => {});
  }
};

// ======================================================
// BULK EMAIL
// ======================================================

const sendBulkEmails = async (req, res) => {
  try {
    let { recipients, subject, body, sessionId, cc } = req.body;

    const uploadedFiles = req.files || [];

    // Handle both parsed arrays and JSON strings
    if (typeof recipients === "string") {
      try {
        recipients = JSON.parse(recipients);
      } catch (error) {
        console.error("Recipients parsing error:", error.message);

        return res.status(400).json({
          success: false,
          message: "Invalid recipients data",
        });
      }
    }

    if (!Array.isArray(recipients)) {
      console.error("Recipients is not an array:", typeof recipients);

      return res.status(400).json({
        success: false,
        message: "Recipients must be an array",
      });
    }

    const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 25 MB

    const totalAttachmentSize = uploadedFiles.reduce(
      (total, file) => total + file.size,
      0,
    );

    if (totalAttachmentSize > MAX_TOTAL_SIZE) {
      return res.status(400).json({
        success: false,
        message: "Total attachments must not exceed 25 MB",
      });
    }

    if (!sessionId) {
      return res.status(401).json({
        success: false,
        message: "Login session is required",
      });
    }

    console.log("SEND SESSION ID:", sessionId);

    const session = await getSession(sessionId);

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Recipients are required",
      });
    }

    if (!subject || !subject.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject is required",
      });
    }

    if (!body || !body.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email body is required",
      });
    }

    const ccAddresses = cc
      ? String(cc)
          .split(",")
          .map((email) => email.trim())
          .filter(Boolean)
      : [];

    const invalidCc = ccAddresses.filter(
      (email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    );

    if (invalidCc.length > 0) {
      return res.status(400).json({
        success: false,
        message: "One or more CC email addresses are invalid",
        invalidCc,
      });
    }

    const smtpClient = await createSmtpClient(session.email, session.password);

    const emailAttachments = uploadedFiles.map((file) => ({
      data: file.buffer,
      name: file.originalname,
      type: file.mimetype,
    }));

    // ==================================================
    // LOAD CURRENT USER'S SAVED RECIPIENTS
    // ==================================================

    const recipientsData = await getRecipientsData();

    const userEmail = session.email;

    if (!recipientsData[userEmail]) {
      recipientsData[userEmail] = [];
    }

    const savedRecipients = recipientsData[userEmail];

    // ==================================================
    // ORIGINAL FRONTEND ORDER MAINTAIN
    // ==================================================

    const results = [...recipients];

    for (let index = 0; index < results.length; index++) {
      const person = results[index];

      const { id, email, firstName } = person;

      // =================================================
      // CHECK SAVED RECORD FIRST
      // =================================================

      const savedIndex = savedRecipients.findIndex(
        (savedPerson) => savedPerson.id === id,
      );

      const savedPerson =
        savedIndex !== -1 ? savedRecipients[savedIndex] : person;

      // =================================================
      // ALREADY SENT → NEVER SEND AGAIN
      // =================================================

      if (savedPerson.emailSent === "Yes") {
        console.log(`Already sent, skipping: ${email}`);

        results[index] = {
          ...savedPerson,
        };

        continue;
      }

      // =================================================
      // VALIDATION
      // =================================================

      if (!email || !firstName) {
        const failedRecord = {
          ...savedPerson,
          id,
          email: email || "",
          firstName: firstName || "",
          status: "Failed",
          emailSent: "No",
          sentAt: "",
          error: "Email and firstName are required",
        };

        results[index] = failedRecord;

        if (savedIndex !== -1) {
          savedRecipients[savedIndex] = failedRecord;
        } else {
          savedRecipients.push(failedRecord);
        }

        await saveRecipientsData(recipientsData);

        continue;
      }

      try {
        // ===============================================
        // PERSONALIZE
        // ===============================================

        const personalizedBody = body.replace(/\{first_name\}/g, firstName);

        const finalHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
  </head>

  <body>
    <div>
      ${personalizedBody}
    </div>
  </body>
</html>
`;

        const message = {
          text: personalizedBody,
          from: session.email,
          to: email,
          subject: subject.trim(),

          ...(ccAddresses.length > 0 && {
            cc: ccAddresses.join(", "),
          }),

          attachment: [
            {
              data: finalHtml,
              alternative: true,
            },

            ...emailAttachments,
          ],
        };

        // ===============================================
        // SEND
        // ===============================================

        await new Promise((resolve, reject) => {
          smtpClient.send(message, (error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          });
        });

        // ===============================================
        // SAVE TO SENT
        // ===============================================

        await saveToSent(
          {
            from: session.email,
            to: email,
            cc: ccAddresses.join(", "),
            subject: subject.trim(),
            text: personalizedBody,
            html: finalHtml,
          },
          session.email,
          session.password,
          uploadedFiles.map((file) => ({
            name: file.originalname,
            type: file.mimetype,
            data: file.buffer,
          })),
        );

        // ===============================================
        // SUCCESS RECORD
        // ===============================================

        const successRecord = {
          ...savedPerson,
          id,
          email,
          firstName,
          status: "Sent",
          emailSent: "Yes",
          sentAt: new Date().toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          }),
          error: "",
        };

        results[index] = successRecord;

        // ===============================================
        // SAVE PERMANENTLY
        // ===============================================

        if (savedIndex !== -1) {
          savedRecipients[savedIndex] = successRecord;
        } else {
          savedRecipients.push(successRecord);
        }

        await saveRecipientsData(recipientsData);

        console.log(`Sent to: ${email}`);
      } catch (error) {
        const errorMessage = error.message || "";

        const lowerError = errorMessage.toLowerCase();

        const isRecipientNotFound =
          lowerError.includes("recipient") ||
          lowerError.includes("user unknown") ||
          lowerError.includes("mailbox unavailable") ||
          lowerError.includes("no such user") ||
          lowerError.includes("address rejected") ||
          lowerError.includes("invalid address");

        // ===============================================
        // FAILED / NOT FOUND
        // ===============================================

        const failedRecord = {
          ...savedPerson,
          id,
          email,
          firstName,
          status: isRecipientNotFound ? "Not Found" : "Failed",
          emailSent: "No",
          sentAt: "",
          error: errorMessage,
        };

        results[index] = failedRecord;

        if (savedIndex !== -1) {
          savedRecipients[savedIndex] = failedRecord;
        } else {
          savedRecipients.push(failedRecord);
        }

        await saveRecipientsData(recipientsData);

        console.error(
          `${isRecipientNotFound ? "Not Found" : "Failed"}: ${email}`,
          errorMessage,
        );
      }
    }

    // ==================================================
    // SUMMARY
    // ==================================================

    const sentCount = results.filter(
      (person) => person.emailSent === "Yes",
    ).length;

    const failedCount = results.filter(
      (person) => person.status === "Failed" || person.status === "Not Found",
    ).length;

    return res.status(200).json({
      success: true,
      message: "Bulk sending completed",

      summary: {
        total: results.length,
        sent: sentCount,
        failed: failedCount,
      },

      results,
    });
  } catch (error) {
    console.error("Bulk email error:", error);

    return res.status(500).json({
      success: false,
      message: "Bulk sending failed",
      error: error.message,
    });
  }
};

// ======================================================
// EXCEL EXPORT
// ======================================================

const exportEmailRecords = async (req, res) => {
  try {
    const session = await getUserSession(req, res);

    if (!session) return;

    const recipientsData = await getRecipientsData();

    const userEmail = session.email;

    const recipients = recipientsData[userEmail] || [];

    if (recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No recipient records found",
      });
    }

    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet("Email Records");

    worksheet.columns = [
      {
        header: "Email",
        key: "email",
        width: 35,
      },
      {
        header: "First Name",
        key: "firstName",
        width: 20,
      },
      {
        header: "Email Sent",
        key: "emailSent",
        width: 15,
      },
      {
        header: "Status",
        key: "status",
        width: 15,
      },
      {
        header: "Date",
        key: "sentAt",
        width: 25,
      },
    ];

    recipients.forEach((person) => {
      worksheet.addRow({
        email: person.email || "",
        firstName: person.firstName || "",
        emailSent: person.emailSent || "No",
        status: person.status || "Pending",
        sentAt: person.sentAt || "",
      });
    });

    worksheet.getRow(1).font = {
      bold: true,
    };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="email_records.xlsx"',
    );

    await workbook.xlsx.write(res);

    res.end();
  } catch (error) {
    console.error("Excel export error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to export Excel",
      error: error.message,
    });
  }
};

module.exports = {
  sendTestEmail,
  sendBulkEmails,
  exportEmailRecords,
};
