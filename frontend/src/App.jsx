import { useEffect, useState } from "react";
import "./App.css";
import Login from "./components/Login";

const API_URL = "https://finovo-email.vercel.app/";

function App() {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const [templateName, setTemplateName] = useState("");
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("");

  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [recipients, setRecipients] = useState([]);

  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("Ready");

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");

  // =========================
  // LOAD TEMPLATES
  // =========================

  const loadTemplates = async () => {
    try {
      const sessionId = localStorage.getItem("sessionId");

      const response = await fetch(`${API_URL}/api/templates/list`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load templates");
      }

      setTemplates(data.templates);

      if (data.templates.length > 0) {
        setSelectedTemplate(data.templates[0].id);
        setSubject(data.templates[0].subject);
        setBody(data.templates[0].body);
      } else {
        setSelectedTemplate("");
        setSubject("");
        setBody("");
      }
    } catch (error) {
      console.error("Template loading error:", error);
      setStatus(error.message || "Failed to load templates");
    }
  };

  const loadRecipients = async () => {
    try {
      const sessionId = localStorage.getItem("sessionId");

      const response = await fetch(`${API_URL}/api/recipients/list`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load recipients");
      }

      setRecipients(data.recipients);
    } catch (error) {
      console.error("Recipient loading error:", error);
      setStatus(error.message || "Failed to load recipients");
    }
  };
  useEffect(() => {
    const restoreSession = async () => {
      const sessionId = localStorage.getItem("sessionId");

      if (!sessionId) {
        setCheckingSession(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/auth/check-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error("Session check failed:", data.message);

          localStorage.removeItem("sessionId");
          setLoggedInUser(null);
          return;
        }

        setLoggedInUser({
          email: data.email,
        });
      } catch (error) {
        console.error("Session restore error:", error);
      } finally {
        setCheckingSession(false);
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    if (loggedInUser) {
      loadTemplates();
      loadRecipients();
    }
  }, [loggedInUser]);

  if (checkingSession) {
    return (
      <div className="app">
        <div className="container">
          <h2>Checking session...</h2>
        </div>
      </div>
    );
  }

  if (!loggedInUser) {
    return (
      <Login
        onLogin={(user) => {
          setLoggedInUser(user);
        }}
      />
    );
  }

  // =========================
  // USE TEMPLATE
  // =========================

  const useTemplate = (template) => {
    setSelectedTemplate(template.id);

    setSubject(template.subject);
    setBody(template.body);

    setStatus(`Template selected: ${template.name}`);
  };

  const handleTemplateChange = (event) => {
    const templateId = event.target.value;

    const template = templates.find((item) => item.id === templateId);

    if (!template) {
      return;
    }

    useTemplate(template);
  };

  // =========================
  // CREATE / EDIT TEMPLATE
  // =========================

  const openCreateTemplate = () => {
    setEditingTemplateId(null);

    setTemplateName("");
    setTemplateSubject("");
    setTemplateBody("");

    setShowTemplateForm(true);
  };

  const openEditTemplate = (template) => {
    setEditingTemplateId(template.id);

    setTemplateName(template.name);
    setTemplateSubject(template.subject);
    setTemplateBody(template.body);

    setShowTemplateForm(true);
  };

  const closeTemplateForm = () => {
    setShowTemplateForm(false);

    setEditingTemplateId(null);

    setTemplateName("");
    setTemplateSubject("");
    setTemplateBody("");
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      alert("Enter template name.");
      return;
    }

    if (!templateSubject.trim()) {
      alert("Enter template subject.");
      return;
    }

    if (!templateBody.trim()) {
      alert("Enter template body.");
      return;
    }

    try {
      const isEditing = Boolean(editingTemplateId);

      const url = isEditing
        ? `${API_URL}/api/templates/${editingTemplateId}`
        : `${API_URL}/api/templates`;

      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: templateName,
          subject: templateSubject,
          body: templateBody,
          sessionId: localStorage.getItem("sessionId"),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save template");
      }

      await loadTemplates();

      setSelectedTemplate(data.template.id);

      setSubject(data.template.subject);
      setBody(data.template.body);

      closeTemplateForm();

      setStatus(
        isEditing
          ? "Template updated successfully"
          : "Template created successfully",
      );
    } catch (error) {
      console.error("Save template error:", error);

      alert(`Failed to save template.\n\n${error.message}`);
    }
  };

  // =========================
  // DELETE TEMPLATE
  // =========================

  const deleteTemplate = async (id) => {
    try {
      const sessionId = localStorage.getItem("sessionId");

      const response = await fetch(`${API_URL}/api/templates/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete template");
      }

      await loadTemplates();

      setStatus("Template deleted successfully");
    } catch (error) {
      console.error("Delete template error:", error);
      setStatus(error.message || "Failed to delete template");
    }
  };

  // =========================
  // RECIPIENT
  // =========================

  const addRecipient = async (e) => {
    e.preventDefault();

    if (!email.trim() || !firstName.trim()) {
      setStatus("Email and first name are required");
      return;
    }

    try {
      const sessionId = localStorage.getItem("sessionId");

      const response = await fetch(`${API_URL}/api/recipients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim(),
          sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to add recipient");
      }

      setRecipients((prev) => [...prev, data.recipient]);

      setEmail("");
      setFirstName("");

      setStatus("Recipient added successfully");
    } catch (error) {
      console.error("Add recipient error:", error);
      setStatus(error.message || "Failed to add recipient");
    }
  };

  const deleteRecipient = async (id) => {
    try {
      const sessionId = localStorage.getItem("sessionId");

      const response = await fetch(`${API_URL}/api/recipients/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete recipient");
      }

      setRecipients((prev) => prev.filter((recipient) => recipient.id !== id));

      setStatus("Recipient deleted successfully");
    } catch (error) {
      console.error("Delete recipient error:", error);
      setStatus(error.message || "Failed to delete recipient");
    }
  };

  // =========================
  // SEND EMAILS
  // =========================

  const sendEmails = async () => {
    if (recipients.length === 0) {
      alert("Please add at least one recipient.");
      return;
    }

    if (!subject.trim()) {
      alert("Please enter an email subject.");
      return;
    }

    if (!body.trim()) {
      alert("Please enter an email body.");
      return;
    }

    try {
      setSending(true);
      setStatus("Sending emails...");

      const response = await fetch(`${API_URL}/api/email/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          body,
          recipients,
          sessionId: localStorage.getItem("sessionId"),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send emails");
      }

      setRecipients(data.results);

      setStatus(
        `Completed: ${data.summary.sent} sent | ${data.summary.failed} failed`,
      );

      alert(
        `Sending completed!\n\n` +
          `Sent: ${data.summary.sent}\n` +
          `Failed: ${data.summary.failed}`,
      );
    } catch (error) {
      console.error("Send error:", error);

      setStatus("Error occurred");

      alert(`Failed to send emails.\n\n${error.message}`);
    } finally {
      setSending(false);
    }
  };

  // =========================
  // EXPORT EXCEL
  // =========================

  const exportExcel = async () => {
    if (recipients.length === 0) {
      alert("No recipient records to export.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/email/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipients,
        }),
      });

      if (!response.ok) {
        const data = await response.json();

        throw new Error(data.message || "Failed to export Excel");
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = "email_records.xlsx";

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Excel export error:", error);

      alert(`Failed to export Excel.\n\n${error.message}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("sessionId");

    setLoggedInUser(null);
  };

  return (
    <div className="app">
      <div className="app-header">
        <div>
          <h1>Email Sender</h1>
          <p>Logged in as: {loggedInUser?.email}</p>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
      <div className="container">
        <h1>AI Email Sender</h1>

        {/* =========================
            TEMPLATE SECTION
        ========================= */}

        <div className="section">
          <div className="section-header">
            <label>Email Template</label>

            <button
              className="template-create-btn"
              onClick={openCreateTemplate}
            >
              + New Template
            </button>
          </div>

          <select value={selectedTemplate} onChange={handleTemplateChange}>
            {templates.length === 0 ? (
              <option value="">No templates available</option>
            ) : (
              templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* =========================
            TEMPLATE MANAGER
        ========================= */}

        <div className="section">
          <label>Saved Templates</label>

          <div className="template-list">
            {templates.length === 0 ? (
              <div className="empty">No templates available</div>
            ) : (
              templates.map((template) => (
                <div className="template-card" key={template.id}>
                  <div className="template-info">
                    <strong>{template.name}</strong>

                    <span>{template.subject}</span>
                  </div>

                  <div className="template-actions">
                    <button onClick={() => useTemplate(template)}>Use</button>

                    <button onClick={() => openEditTemplate(template)}>
                      Edit
                    </button>

                    <button
                      className="delete-template-btn"
                      onClick={() => deleteTemplate(template.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* =========================
            CREATE / EDIT TEMPLATE
        ========================= */}

        {showTemplateForm && (
          <div className="template-form section">
            <h2>
              {editingTemplateId ? "Edit Template" : "Create New Template"}
            </h2>

            <label>Template Name</label>

            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Travel Agency Outreach"
            />

            <label>Template Subject</label>

            <input
              type="text"
              value={templateSubject}
              onChange={(e) => setTemplateSubject(e.target.value)}
              placeholder="Enter email subject"
            />

            <label>Template Body</label>

            <textarea
              value={templateBody}
              onChange={(e) => setTemplateBody(e.target.value)}
              rows="12"
              placeholder="Hi {first_name},..."
            />

            <p className="hint">
              Use <strong>{"{first_name}"}</strong> for recipient
              personalization.
            </p>

            <div className="template-form-actions">
              <button onClick={saveTemplate}>
                {editingTemplateId ? "UPDATE TEMPLATE" : "SAVE TEMPLATE"}
              </button>

              <button onClick={closeTemplateForm}>CANCEL</button>
            </div>
          </div>
        )}

        {/* =========================
            EMAIL SUBJECT
        ========================= */}

        <div className="section">
          <label>Email Subject</label>

          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter email subject"
          />
        </div>

        {/* =========================
            RECIPIENT
        ========================= */}

        <div className="section">
          <label>Add Recipient</label>

          <div className="recipient-form">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />

            <button onClick={addRecipient}>+ Add</button>
          </div>
        </div>

        {/* =========================
            RECIPIENT TABLE
        ========================= */}

        <div className="section">
          <label>Recipients ({recipients.length})</label>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>First Name</th>
                  <th>Status</th>
                  <th>Email Sent</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {recipients.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty">
                      No recipients added
                    </td>
                  </tr>
                ) : (
                  recipients.map((person, index) => (
                    <tr key={index}>
                      <td>{person.email}</td>
                      <td>{person.firstName}</td>
                      <td>{person.status}</td>
                      <td>{person.emailSent}</td>

                      <td>
                        <button onClick={() => deleteRecipient(person.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* =========================
            EMAIL BODY
        ========================= */}

        <div className="section">
          <label>Email Body</label>

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows="14"
            placeholder="Write your email body..."
          />

          <p className="hint">
            Use <strong>{"{first_name}"}</strong> to automatically personalize
            the email.
          </p>
        </div>

        {/* =========================
            ACTIONS
        ========================= */}

        <div className="actions">
          <button className="send-btn" onClick={sendEmails} disabled={sending}>
            {sending ? "SENDING..." : "SEND ALL EMAILS"}
          </button>

          <button
            className="excel-btn"
            onClick={exportExcel}
            disabled={recipients.length === 0}
          >
            DOWNLOAD EXCEL
          </button>
        </div>

        {/* =========================
            STATUS
        ========================= */}

        <div className="status">
          Status: <strong>{status}</strong>
        </div>
      </div>
    </div>
  );
}

export default App;
