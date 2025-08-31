'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create sample users
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const userPasswordHash = await bcrypt.hash('user123', 10);

    const users = [
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        name: 'Admin User',
        email: 'admin@ghiblifood.com',
        password: adminPasswordHash,
        role: 'admin',
        bio: 'Administrator of the Ghibli Food Recipe platform',
        is_active: true,
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        name: 'Chihiro Ogino',
        email: 'chihiro@spiritedaway.com',
        password: userPasswordHash,
        role: 'user',
        bio: 'Loves discovering magical recipes and sharing culinary adventures',
        is_active: true,
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        name: 'Howl Jenkins',
        email: 'howl@movingcastle.com',
        password: userPasswordHash,
        role: 'user',
        bio: 'Wizard chef who creates beautiful and magical dishes',
        is_active: true,
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        name: 'Sophie Hatter',
        email: 'sophie@movingcastle.com',
        password: userPasswordHash,
        role: 'user',
        bio: 'Baker extraordinaire with a passion for hearty comfort foods',
        is_active: true,
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        name: 'Totoro Guest',
        email: 'guest@totoro.com',
        password: userPasswordHash,
        role: 'guest',
        bio: 'Temporary user exploring Ghibli-inspired recipes',
        is_active: true,
        email_verified: false,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    await queryInterface.bulkInsert('users', users);

    // Get user IDs for books
    const insertedUsers = await queryInterface.sequelize.query(
      'SELECT id, email FROM users ORDER BY created_at',
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Create sample books
    const books = [
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        title: 'Spirited Away Kitchen Secrets',
        author: 'Yubaba\'s Kitchen Staff',
        isbn: '978-1-23456-789-0',
        genre: 'Japanese Cuisine',
        description: 'Discover the magical recipes from the bathhouse kitchen, including the famous river spirit\'s feast and No-Face\'s favorite snacks.',
        published_date: '2020-07-20',
        book_cover_url: 'https://example.com/covers/spirited-away-kitchen.jpg',
        cuisine_type: 'Japanese',
        dietary_category: 'Omnivore',
        difficulty_level: 'medium',
        ingredients: JSON.stringify([
          'Rice', 'Seaweed', 'Fresh Fish', 'Soy Sauce', 'Miso Paste',
          'Green Onions', 'Ginger', 'Sake', 'Mirin', 'Dashi Stock'
        ]),
        sample_recipes: 'River Spirit Dumplings, No-Face Onigiri, Bathhouse Feast Bento',
        author_bio: 'The kitchen staff of Yubaba\'s bathhouse, masters of magical cuisine.',
        visibility: true,
        user_id: insertedUsers[0].id,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        title: 'Howl\'s Moving Castle Breakfast Collection',
        author: 'Calcifer & Sophie',
        isbn: '978-1-23456-790-6',
        genre: 'Breakfast & Brunch',
        description: 'Start your day with magical breakfast recipes inspired by the moving castle\'s kitchen, featuring Calcifer\'s flame-cooked specialties.',
        published_date: '2021-03-15',
        book_cover_url: 'https://example.com/covers/howls-breakfast.jpg',
        cuisine_type: 'European',
        dietary_category: 'Vegetarian',
        difficulty_level: 'easy',
        ingredients: JSON.stringify([
          'Eggs', 'Bacon', 'Bread', 'Butter', 'Fresh Herbs',
          'Milk', 'Cheese', 'Potatoes', 'Tomatoes', 'Mushrooms'
        ]),
        sample_recipes: 'Calcifer\'s Flame Eggs, Castle Toast, Sophie\'s Garden Omelet',
        author_bio: 'Calcifer, the fire demon, and Sophie Hatter, the castle\'s baker.',
        visibility: true,
        user_id: insertedUsers[1].id,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        title: 'Totoro\'s Forest Feast',
        author: 'Satsuki & Mei Kusakabe',
        isbn: '978-1-23456-791-3',
        genre: 'Healthy & Light',
        description: 'Wholesome recipes inspired by the forest spirits and the simple country life of the Kusakabe family.',
        published_date: '2021-06-10',
        book_cover_url: 'https://example.com/covers/totoro-forest.jpg',
        cuisine_type: 'Japanese',
        dietary_category: 'Vegetarian',
        difficulty_level: 'easy',
        ingredients: JSON.stringify([
          'Fresh Vegetables', 'Rice', 'Tofu', 'Mushrooms', 'Herbs',
          'Seasonal Fruits', 'Green Tea', 'Honey', 'Nuts', 'Seeds'
        ]),
        sample_recipes: 'Totoro\'s Acorn Cookies, Forest Vegetable Soup, Catbus Bento',
        author_bio: 'Two sisters sharing their love for nature-inspired cooking.',
        visibility: true,
        user_id: insertedUsers[2].id,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        title: 'Princess Mononoke Wild Game Cookbook',
        author: 'Lady Eboshi & Iron Town Chefs',
        isbn: '978-1-23456-792-0',
        genre: 'Comfort Food',
        description: 'Hearty recipes from Iron Town, featuring wild game and foraged ingredients from the ancient forest.',
        published_date: '2022-01-20',
        book_cover_url: 'https://example.com/covers/mononoke-cookbook.jpg',
        cuisine_type: 'Japanese',
        dietary_category: 'Omnivore',
        difficulty_level: 'hard',
        ingredients: JSON.stringify([
          'Wild Boar', 'Venison', 'Forest Mushrooms', 'Wild Herbs',
          'Root Vegetables', 'Game Birds', 'Wild Rice', 'Berries'
        ]),
        sample_recipes: 'Iron Town Stew, Forest Spirit Broth, Wild Boar Ramen',
        author_bio: 'Chefs from Iron Town, specializing in wild game and foraged foods.',
        visibility: true,
        user_id: insertedUsers[0].id,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        title: 'Kiki\'s Delivery Service Bakery Treats',
        author: 'Osono & Kiki',
        isbn: '978-1-23456-793-7',
        genre: 'Baking & Bread',
        description: 'Delightful pastries and baked goods from Osono\'s bakery, perfect for any aspiring witch or baker.',
        published_date: '2021-09-05',
        book_cover_url: 'https://example.com/covers/kikis-bakery.jpg',
        cuisine_type: 'European',
        dietary_category: 'Vegetarian',
        difficulty_level: 'medium',
        ingredients: JSON.stringify([
          'Flour', 'Butter', 'Sugar', 'Eggs', 'Yeast',
          'Milk', 'Vanilla', 'Chocolate', 'Fruits', 'Nuts'
        ]),
        sample_recipes: 'Kiki\'s Flying Croissants, Osono\'s Daily Bread, Witch Hat Cookies',
        author_bio: 'Osono, master baker, and Kiki, the delivery witch with a sweet tooth.',
        visibility: true,
        user_id: insertedUsers[3].id,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    await queryInterface.bulkInsert('books', books);

    // Create sample tags
    const tags = [
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        name: 'magical',
        description: 'Recipes with a touch of magic',
        usage_count: 0,
        created_at: new Date()
      },
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        name: 'quick',
        description: 'Quick and easy recipes',
        usage_count: 0,
        created_at: new Date()
      },
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        name: 'family-friendly',
        description: 'Perfect for family meals',
        usage_count: 0,
        created_at: new Date()
      },
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        name: 'seasonal',
        description: 'Uses seasonal ingredients',
        usage_count: 0,
        created_at: new Date()
      },
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        name: 'traditional',
        description: 'Traditional cooking methods',
        usage_count: 0,
        created_at: new Date()
      }
    ];

    await queryInterface.bulkInsert('tags', tags);

    console.log('✅ Sample data seeded successfully!');
    console.log('👤 Test users created:');
    console.log('   Admin: admin@ghiblifood.com / admin123');
    console.log('   Users: chihiro@spiritedaway.com / user123');
    console.log('          howl@movingcastle.com / user123');
    console.log('          sophie@movingcastle.com / user123');
    console.log('   Guest: guest@totoro.com / user123');
    console.log('📚 Sample recipe books and categories created');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('tags', null, {});
    await queryInterface.bulkDelete('books', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};