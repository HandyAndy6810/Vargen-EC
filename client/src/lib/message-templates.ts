export interface MessageTemplate {
  id: string;
  label: string;
  subject: (name: string) => string;
  body: (name: string) => string;
}

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: "quote_ready",
    label: "Quote Ready",
    subject: (name: string) => `Your Quote is Ready`,
    body: (name: string) => `Hi ${name},\n\nYour quote is ready for review. Please let me know if you have any questions or would like to discuss anything.\n\nThanks,`,
  },
  {
    id: "running_late",
    label: "Running Late",
    subject: (name: string) => `Running a bit late`,
    body: (name: string) => `Hi ${name},\n\nJust letting you know I'm running a bit late today. I'll be there as soon as I can. Apologies for the inconvenience!\n\nThanks,`,
  },
  {
    id: "follow_up",
    label: "Follow Up",
    subject: (name: string) => `Following up`,
    body: (name: string) => `Hi ${name},\n\nI just wanted to follow up and see if you had any questions about the work we discussed. Happy to chat anytime.\n\nThanks,`,
  },
  {
    id: "job_complete",
    label: "Job Complete",
    subject: (name: string) => `Job Completed`,
    body: (name: string) => `Hi ${name},\n\nThe job has been completed. Please don't hesitate to get in touch if you need anything else. It was great working with you!\n\nThanks,`,
  },
];
