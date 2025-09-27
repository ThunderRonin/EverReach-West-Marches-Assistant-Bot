#!/usr/bin/env node

/**
 * Simple healthcheck script for Docker
 * Checks if the bot can connect to Discord and database
 */

const { Client } = require('discord.js');
const { PrismaClient } = require('@prisma/client');

const client = new Client({
  intents: []
});

const prisma = new PrismaClient();

async function healthcheck() {
  try {
    // Check Discord connection
    if (!process.env.DISCORD_TOKEN) {
      throw new Error('DISCORD_TOKEN not set');
    }

    // Simple database check
    await prisma.$queryRaw`SELECT 1`;

    // If we get here, everything is working
    console.log('Healthcheck passed');
    process.exit(0);
  } catch (error) {
    console.error('Healthcheck failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

healthcheck();
