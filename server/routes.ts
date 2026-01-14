import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

// Integration imports
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerAudioRoutes } from "./replit_integrations/audio";
import { registerImageRoutes } from "./replit_integrations/image";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // 1. Setup Auth (MUST be first)
  await setupAuth(app);
  registerAuthRoutes(app);

  // 2. Register Integration Routes
  registerChatRoutes(app);
  registerAudioRoutes(app);
  registerImageRoutes(app);

  // 3. Register Application Routes
  
  // Customers
  app.get(api.customers.list.path, async (req, res) => {
    const customers = await storage.getCustomers();
    res.json(customers);
  });

  app.get(api.customers.get.path, async (req, res) => {
    const customer = await storage.getCustomer(Number(req.params.id));
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  });

  app.post(api.customers.create.path, async (req, res) => {
    try {
      const input = api.customers.create.input.parse(req.body);
      const customer = await storage.createCustomer(input);
      res.status(201).json(customer);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Jobs
  app.get(api.jobs.list.path, async (req, res) => {
    const jobs = await storage.getJobs();
    res.json(jobs);
  });

  app.post(api.jobs.create.path, async (req, res) => {
    try {
      const input = api.jobs.create.input.parse(req.body);
      const job = await storage.createJob(input);
      res.status(201).json(job);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.patch(api.jobs.update.path, async (req, res) => {
    try {
      const input = api.jobs.update.input.parse(req.body);
      const job = await storage.updateJob(Number(req.params.id), input);
      res.json(job);
    } catch (err) {
       res.status(400).json({ message: "Validation error" });
    }
  });

  // Quotes
  app.get(api.quotes.list.path, async (req, res) => {
    const quotes = await storage.getQuotes();
    res.json(quotes);
  });

  app.post(api.quotes.create.path, async (req, res) => {
    try {
      const input = api.quotes.create.input.parse(req.body);
      const quote = await storage.createQuote(input);
      res.status(201).json(quote);
    } catch (err) {
      res.status(400).json({ message: "Validation error" });
    }
  });

  // Seed data function
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingCustomers = await storage.getCustomers();
  if (existingCustomers.length === 0) {
    const c1 = await storage.createCustomer({
      name: "Alice Smith",
      email: "alice@example.com",
      phone: "555-0101",
      address: "123 Maple St",
    });
    const c2 = await storage.createCustomer({
      name: "Bob Jones",
      email: "bob@example.com",
      phone: "555-0102",
      address: "456 Oak Ave",
    });

    await storage.createJob({
      customerId: c1.id,
      title: "Fix Leaky Faucet",
      description: "Kitchen sink faucet is dripping continuously.",
      status: "scheduled",
      scheduledDate: new Date("2024-10-25T14:00:00Z"),
    });

    await storage.createJob({
      customerId: c2.id,
      title: "Install Ceiling Fan",
      description: "Master bedroom ceiling fan installation.",
      status: "pending",
      scheduledDate: new Date("2024-10-26T10:00:00Z"),
    });
  }
}
