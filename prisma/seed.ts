import { PrismaClient } from '../generated/prisma/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: hashedPassword,
      name: 'Admin User',
      role: 'admin',
    },
  });

  console.log('✅ Created admin user:', adminUser.email);

  // Create sample email lists
  const emailList1 = await prisma.emailList.create({
    data: {
      name: 'Newsletter Subscribers',
      description: 'Main newsletter subscriber list',
      userId: adminUser.id,
    },
  });

  const emailList2 = await prisma.emailList.create({
    data: {
      name: 'Product Updates',
      description: 'Users interested in product updates',
      userId: adminUser.id,
    },
  });

  console.log('✅ Created email lists:', emailList1.name, emailList2.name);

  // Create sample recipients
  const recipients = [
    {
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
    },
    {
      email: 'jane.smith@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
    },
    {
      email: 'bob.johnson@example.com',
      firstName: 'Bob',
      lastName: 'Johnson',
    },
    {
      email: 'alice.brown@example.com',
      firstName: 'Alice',
      lastName: 'Brown',
    },
    {
      email: 'charlie.wilson@example.com',
      firstName: 'Charlie',
      lastName: 'Wilson',
    },
  ];

  const createdRecipients = await Promise.all(
    recipients.map(recipient => 
      prisma.recipient.upsert({
        where: { email: recipient.email },
        update: {},
        create: recipient,
      })
    )
  );

  console.log('✅ Created recipients:', createdRecipients.length);

  // Add recipients to email lists
  for (let i = 0; i < createdRecipients.length; i++) {
    const recipient = createdRecipients[i];
    
    // Add all recipients to Newsletter Subscribers
    await prisma.listRecipient.upsert({
      where: {
        listId_recipientId: {
          listId: emailList1.id,
          recipientId: recipient.id,
        },
      },
      update: {},
      create: {
        listId: emailList1.id,
        recipientId: recipient.id,
      },
    });

    // Add first 3 recipients to Product Updates
    if (i < 3) {
      await prisma.listRecipient.upsert({
        where: {
          listId_recipientId: {
            listId: emailList2.id,
            recipientId: recipient.id,
          },
        },
        update: {},
        create: {
          listId: emailList2.id,
          recipientId: recipient.id,
        },
      });
    }
  }

  console.log('✅ Added recipients to email lists');

  // Create sample email templates
  const templates = await Promise.all([
    prisma.emailTemplate.create({
      data: {
        userId: adminUser.id,
        name: 'Welcome Template',
        subject: 'Welcome to {{company_name}}!',
        content: '<h1>Welcome {{first_name}}!</h1><p>Thank you for joining our community. We\'re excited to have you on board!</p><p>Best regards,<br>The {{company_name}} Team</p>',
        category: 'Welcome',
        isDefault: true
      }
    }),
    prisma.emailTemplate.create({
      data: {
        userId: adminUser.id,
        name: 'Newsletter Template',
        subject: '{{company_name}} Newsletter - {{month}} {{year}}',
        content: '<h1>Monthly Newsletter</h1><p>Dear {{first_name}},</p><p>Here are the latest updates from {{company_name}}:</p><ul><li>Feature 1</li><li>Feature 2</li><li>Feature 3</li></ul><p>Stay tuned for more updates!</p>',
        category: 'Newsletter'
      }
    }),
    prisma.emailTemplate.create({
      data: {
        userId: adminUser.id,
        name: 'Product Launch Template',
        subject: 'Introducing {{product_name}} - Now Available!',
        content: '<h1>🚀 New Product Launch!</h1><p>Hi {{first_name}},</p><p>We\'re thrilled to announce the launch of {{product_name}}!</p><p>{{product_description}}</p><p><a href="{{product_url}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Learn More</a></p>',
        category: 'Product'
      }
    })
  ]);

  console.log('✅ Created email templates:', templates.length);

  // Create sample campaigns using templates
  const campaign1 = await prisma.campaign.create({
    data: {
      name: 'Welcome Campaign',
      subject: 'Welcome to our newsletter!',
      content: '<h1>Welcome!</h1><p>Thank you for subscribing to our newsletter.</p>',
      status: 'draft',
      userId: adminUser.id,
      templateId: templates[0].id,
    },
  });

  const campaign2 = await prisma.campaign.create({
    data: {
      name: 'Product Launch',
      subject: 'Exciting new product launch!',
      content: '<h1>New Product Alert!</h1><p>Check out our latest product offering.</p>',
      status: 'draft',
      userId: adminUser.id,
      templateId: templates[2].id,
    },
  });

  console.log('✅ Created campaigns:', campaign1.name, campaign2.name);

  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('📋 Summary:');
  console.log('- Admin user: admin@example.com (password: admin123)');
  console.log('- Email lists: 2');
  console.log('- Recipients: 5');
  console.log('- Email templates: 3');
  console.log('- Campaigns: 2');
  console.log('');
  console.log('🔗 Access Prisma Studio: npx prisma studio');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });