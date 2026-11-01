/**
 * resolvers/menu.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Menu management mutations: categories, food items, publish workflow.
 */

import { GraphQLError } from 'graphql'
import mongoose from 'mongoose'
import { Restaurant, Category, Food } from '../../models/index.js'
import { assertPublicAccess, requireUser, requireRestaurantOwner } from '../../auth/jwt.js'
import { liveCategories, mapFood, publishRestaurantMenu } from '../../services/menu.js'
import { saveBase64Image } from '../../utils/imageUpload.js'
import { buildRestaurantTreeById } from './restaurant.js'
import { id } from './helpers.js'

// ---------------------------------------------------------------------------
// Internal: mark that menu has pending changes
// ---------------------------------------------------------------------------

async function menuChanged(restaurantId) {
  await Restaurant.updateOne(
    { _id: restaurantId },
    { $set: { hasUnpublishedMenuChanges: true } }
  )
  return buildRestaurantTreeById(restaurantId)
}

// ---------------------------------------------------------------------------
// Exported: menu publish status shape
// ---------------------------------------------------------------------------

export const menuPublishStatusOf = (restaurant) => {
  const categories = restaurant.publishedMenu?.categories || []
  return {
    restaurantId: id(restaurant),
    menuPublishedAt:
      restaurant.menuPublishedAt?.toISOString?.() || restaurant.menuPublishedAt || null,
    hasUnpublishedMenuChanges: Boolean(restaurant.hasUnpublishedMenuChanges),
    publishedCategories: categories.length,
    publishedItems: categories.reduce((sum, c) => sum + (c.foods?.length || 0), 0)
  }
}

// ---------------------------------------------------------------------------
// Menu mutations
// ---------------------------------------------------------------------------

export const menuMutations = {
  createCategory: async (_p, { category }, ctx) => {
    assertPublicAccess(ctx)
    requireRestaurantOwner(ctx, category.restaurant)
    await Category.create({
      restaurantId: category.restaurant,
      title: category.title,
      image: category.image || ''
    })
    return menuChanged(category.restaurant)
  },

  editCategory: async (_p, { category }, ctx) => {
    assertPublicAccess(ctx)
    requireRestaurantOwner(ctx, category.restaurant)
    const existing = await Category.findById(category._id)
    if (!existing || String(existing.restaurantId) !== String(category.restaurant)) {
      throw new GraphQLError('Category not found')
    }
    if (category.title != null) existing.title = category.title
    if (category.image != null) existing.image = category.image
    await existing.save()
    return menuChanged(category.restaurant)
  },

  deleteCategory: async (_p, { id: categoryId, restaurant }, ctx) => {
    assertPublicAccess(ctx)
    requireRestaurantOwner(ctx, restaurant)
    const existing = await Category.findById(categoryId)
    if (!existing || String(existing.restaurantId) !== String(restaurant)) {
      throw new GraphQLError('Category not found')
    }
    await Food.deleteMany({ categoryId })
    await Category.deleteOne({ _id: categoryId })
    return menuChanged(restaurant)
  },

  createFood: async (_p, { foodInput }, ctx) => {
    assertPublicAccess(ctx)
    requireRestaurantOwner(ctx, foodInput.restaurant)
    const category = await Category.findById(foodInput.category)
    if (!category || String(category.restaurantId) !== String(foodInput.restaurant)) {
      throw new GraphQLError('Category does not belong to this restaurant')
    }
    await Food.create({
      restaurantId: foodInput.restaurant,
      categoryId: foodInput.category,
      title: foodInput.title,
      description: foodInput.description || '',
      image: foodInput.image || '',
      subCategory: foodInput.subCategory || null,
      isOutOfStock: Boolean(foodInput.isOutOfStock),
      isActive: foodInput.isActive !== false,
      ingredients: Array.isArray(foodInput.ingredients)
        ? foodInput.ingredients.filter(Boolean)
        : [],
      variations: (foodInput.variations || []).map((v) => ({
        title: v.title || 'Standard',
        price: v.price,
        discounted: v.discounted || 0,
        addons: v.addons || [],
        isOutOfStock: Boolean(v.isOutOfStock)
      }))
    })
    return menuChanged(foodInput.restaurant)
  },

  editFood: async (_p, { foodInput }, ctx) => {
    assertPublicAccess(ctx)
    requireRestaurantOwner(ctx, foodInput.restaurant)
    const existing = await Food.findById(foodInput._id)
    if (!existing || String(existing.restaurantId) !== String(foodInput.restaurant)) {
      throw new GraphQLError('Food not found')
    }
    if (foodInput.category) {
      const category = await Category.findById(foodInput.category)
      if (!category || String(category.restaurantId) !== String(foodInput.restaurant)) {
        throw new GraphQLError('Category does not belong to this restaurant')
      }
      existing.categoryId = foodInput.category
    }
    if (foodInput.title != null) existing.title = foodInput.title
    if (foodInput.description != null) existing.description = foodInput.description
    if (foodInput.image != null) existing.image = foodInput.image
    if (foodInput.subCategory != null) existing.subCategory = foodInput.subCategory
    if (foodInput.isOutOfStock != null) existing.isOutOfStock = foodInput.isOutOfStock
    if (foodInput.isActive != null) existing.isActive = foodInput.isActive
    if (foodInput.ingredients != null) {
      existing.ingredients = Array.isArray(foodInput.ingredients)
        ? foodInput.ingredients.filter(Boolean)
        : []
    }
    if (foodInput.variations) {
      existing.variations = foodInput.variations.map((v) => ({
        ...(v._id ? { _id: v._id } : {}),
        title: v.title || 'Standard',
        price: v.price,
        discounted: v.discounted || 0,
        addons: v.addons || [],
        isOutOfStock: Boolean(v.isOutOfStock)
      }))
    }
    await existing.save()
    return menuChanged(foodInput.restaurant)
  },

  deleteFood: async (_p, { id: foodId, restaurant }, ctx) => {
    assertPublicAccess(ctx)
    requireRestaurantOwner(ctx, restaurant)
    const existing = await Food.findById(foodId)
    if (!existing || String(existing.restaurantId) !== String(restaurant)) {
      throw new GraphQLError('Food not found')
    }
    await Food.deleteOne({ _id: foodId })
    return menuChanged(restaurant)
  },

  updateFoodOutOfStock: async (_p, { id: foodId, restaurant }, ctx) => {
    assertPublicAccess(ctx)
    requireRestaurantOwner(ctx, restaurant)
    const existing = await Food.findById(foodId)
    if (!existing || String(existing.restaurantId) !== String(restaurant)) {
      throw new GraphQLError('Food not found')
    }
    existing.isOutOfStock = !existing.isOutOfStock
    await existing.save()
    await Restaurant.updateOne(
      { _id: restaurant },
      { $set: { hasUnpublishedMenuChanges: true } }
    )
    return existing.isOutOfStock
  },

  createOptions: async (_p, { optionInput }, ctx) => {
    assertPublicAccess(ctx)
    requireRestaurantOwner(ctx, optionInput.restaurant)
    const restaurant = await Restaurant.findById(optionInput.restaurant)
    if (!restaurant) throw new GraphQLError('Restaurant not found')
    const incoming = (optionInput.options || []).map((o) => ({
      _id: new mongoose.Types.ObjectId(),
      title: o.title,
      description: o.description || '',
      price: Number(o.price) || 0
    }))
    restaurant.options = [...(restaurant.options || []), ...incoming]
    await restaurant.save()
    return menuChanged(optionInput.restaurant)
  },

  createAddons: async (_p, { addonInput }, ctx) => {
    assertPublicAccess(ctx)
    requireRestaurantOwner(ctx, addonInput.restaurant)
    const restaurant = await Restaurant.findById(addonInput.restaurant)
    if (!restaurant) throw new GraphQLError('Restaurant not found')
    const incoming = (addonInput.addons || []).map((a) => ({
      _id: new mongoose.Types.ObjectId(),
      title: a.title,
      description: a.description || '',
      quantityMinimum: a.quantityMinimum ?? 0,
      quantityMaximum: a.quantityMaximum ?? 1,
      options: (a.options || []).map(String)
    }))
    restaurant.addons = [...(restaurant.addons || []), ...incoming]
    await restaurant.save()
    return menuChanged(addonInput.restaurant)
  },

  uploadImageToS3: async (_p, { image }, ctx) => {
    assertPublicAccess(ctx)
    requireUser(ctx, ['SUPER_ADMIN', 'RESTAURANT_OWNER'])
    const imageUrl = await saveBase64Image(image, ctx.req)
    return { imageUrl }
  },

  publishMenu: async (_p, { restaurantId }, ctx) => {
    assertPublicAccess(ctx)
    requireRestaurantOwner(ctx, restaurantId)
    const exists = await Restaurant.exists({ _id: restaurantId })
    if (!exists) throw new GraphQLError('Restaurant not found')
    await publishRestaurantMenu(restaurantId)
    const restaurant = await Restaurant.findById(restaurantId).lean()
    return menuPublishStatusOf(restaurant)
  }
}
