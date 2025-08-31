'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const categories = [
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        name: 'Japanese Cuisine',
        description: 'Traditional and modern Japanese cooking recipes',
        icon: '🍱',
        color: '#ff6b6b',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        name: 'Desserts & Sweets',
        description: 'Delightful desserts and sweet treats',
        icon: '🍰',
        color: '#feca57',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        name: 'Comfort Food',
        description: 'Hearty, comforting meals for the soul',
        icon: '🍲',
        color: '#48dbfb',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        name: 'Healthy & Light',
        description: 'Nutritious and light meal options',
        icon: '🥗',
        color: '#0abde3',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        name: 'Vegetarian',
        description: 'Plant-based and vegetarian recipes',
        icon: '🥬',
        color: '#10ac84',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        name: 'Breakfast & Brunch',
        description: 'Morning meals and brunch favorites',
        icon: '🥞',
        color: '#ee5a24',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        name: 'Soups & Stews',
        description: 'Warming soups and hearty stews',
        icon: '🍜',
        color: '#5f27cd',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        name: 'Seafood',
        description: 'Fresh seafood and fish recipes',
        icon: '🐟',
        color: '#54a0ff',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        name: 'Baking & Bread',
        description: 'Baked goods, breads, and pastries',
        icon: '🍞',
        color: '#f0932b',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        name: 'International',
        description: 'Recipes from around the world',
        icon: '🌍',
        color: '#eb4d4b',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    await queryInterface.bulkInsert('categories', categories);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('categories', null, {});
  }
};