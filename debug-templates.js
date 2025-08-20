import { PrismaClient } from './generated/prisma/index.js';

const prisma = new PrismaClient();

async function checkTemplates() {
  try {
    console.log('Checking EmailTemplate table...');
    const templates = await prisma.emailTemplate.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true
      }
    });
    
    console.log('Found templates:');
    templates.forEach((template, index) => {
      console.log(`${index + 1}. ID: "${template.id}" (length: ${template.id.length}) - Name: ${template.name}`);
      console.log(`   ID chars: ${template.id.split('').map(c => c.charCodeAt(0)).join(', ')}`);
    });
    
    console.log('\nChecking for invalid UUIDs...');
    templates.forEach((template) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(template.id)) {
        console.log(`INVALID UUID: "${template.id}" - Name: ${template.name}`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplates();