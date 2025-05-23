const shopifyClient = require('../utils/shopifyClient');

// Search products based on query with enhanced filter support
exports.searchProducts = async (req, res, next) => {
  try {
    const { 
      q, 
      category, 
      limit = 20, 
      page = 1, 
      sort = 'relevance', 
      color, 
      size,
      price,
      cursor
    } = req.query;
    
    console.log('Search request with params:', { q, category, limit, page, sort, color, size, price, cursor });
    
    // For empty searches, return empty results immediately
    if (q !== undefined && (!q || q.trim().length < 2)) {
      return res.status(200).json({ 
        products: [],
        totalCount: 0,
        query: q
      });
    }
    
    // Map sort parameter to Shopify sort key
    let sortKey = 'RELEVANCE';
    let sortDirection = false; // false = DESC, true = ASC in Shopify API
    
    switch (sort.toLowerCase()) {
      case 'price-low-high':
        sortKey = 'PRICE';
        sortDirection = true; // ASC
        break;
      case 'price-high-low':
        sortKey = 'PRICE';
        sortDirection = false; // DESC
        break;
      case 'newest':
        sortKey = 'CREATED_AT';
        sortDirection = false; // DESC
        break;
      case 'alphabetical':
      case 'alphabetical: a-z':
        sortKey = 'TITLE';
        sortDirection = true; // ASC
        break;
      case 'best-selling':
      case 'most-popular':
        sortKey = 'BEST_SELLING';
        sortDirection = false; // DESC
        break;
      default:
        sortKey = 'RELEVANCE';
        sortDirection = false; // DESC
    }
    
    // Build search query with filters
    let filterParts = [];
    
    // Add search query if provided
    if (q) {
      filterParts.push(q);
    }
    
    // Add category filter if specified
    if (category && category !== 'all') {
      filterParts.push(`product_type:${category}`);
    }
    
    // Add color filter if specified
    if (color) {
      // Search for color in tags, variant titles, and option values
      filterParts.push(`(title:${color} OR variants:${color} OR tag:${color} OR option:${color})`);
    }
    
    // Add size filter if specified
    if (size) {
      // Search for size in variant titles and option values
      filterParts.push(`(variants:${size} OR tag:${size} OR option:${size})`);
    }
    
    // Add price filter if specified
    if (price) {
      const [minPrice, maxPrice] = price.split('-');
      if (minPrice && !isNaN(minPrice)) {
        filterParts.push(`variants.price:>=${minPrice}`);
      }
      if (maxPrice && !isNaN(maxPrice)) {
        filterParts.push(`variants.price:<=${maxPrice}`);
      }
    }
    
    // Combine filter parts into a single search query
    const searchQuery = filterParts.join(' AND ');
    console.log('Combined search query:', searchQuery);
    
    // Calculate pagination
    const first = parseInt(limit);
    const after = cursor || null;
    
    // Execute the query
    const gqlQuery = `
      query SearchProducts($query: String!, $first: Int!, $after: String, $sortKey: ProductSortKeys!, $reverse: Boolean!) {
        products(query: $query, first: $first, after: $after, sortKey: $sortKey, reverse: $reverse) {
          edges {
            node {
              id
              title
              handle
              description
              productType
              tags
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 5) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    selectedOptions {
                      name
                      value
                    }
                    availableForSale
                  }
                }
              }
              options {
                name
                values
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;
    
    const variables = {
      query: searchQuery,
      first: first,
      after: after,
      sortKey: sortKey,
      reverse: sortDirection
    };
    
    // Execute the GraphQL query with Shopify client
    const result = await shopifyClient.query(gqlQuery, variables);
    
    // Transform products for the frontend
    const products = result.products?.edges?.map(({ node }) => {
      // Extract first image URL or use placeholder
      const imageUrl = node.images.edges.length > 0 
        ? node.images.edges[0].node.url 
        : null;
      
      // Get additional images
      const images = node.images.edges.map(edge => edge.node.url);
      
      // Get price from price range
      const price = node.priceRange?.minVariantPrice?.amount || '0.00';
      
      // Get variants
      const variants = node.variants?.edges.map(({ node: variant }) => ({
        id: variant.id.split('/').pop(),
        title: variant.title,
        price: variant.price.amount,
        options: variant.selectedOptions,
        available: variant.availableForSale
      })) || [];
      
      // Extract color and size options
      const options = {};
      node.options.forEach(option => {
        const name = option.name.toLowerCase();
        if (name === 'color' || name === 'colour') {
          options.colors = option.values;
        } else if (name === 'size') {
          options.sizes = option.values;
        }
      });
      
      // Transform to simplified structure
      return {
        id: node.id.split('/').pop(),
        handle: node.handle,
        title: node.title,
        description: node.description,
        productType: node.productType,
        tags: node.tags || [],
        price: price,
        image: imageUrl,
        images: images,
        variants: variants,
        options: options
      };
    }) || [];
    
    res.status(200).json({
      products,
      pageInfo: result.products?.pageInfo || { hasNextPage: false },
      query: q || '',
      totalCount: products.length
    });
  } catch (error) {
    console.error('Search error:', error);
    next(error);
  }
};

// Create a specialized endpoint for category filtering (for navbar links)
exports.getProductsByCategory = async (req, res, next) => {
  try {
    const { category, sort = 'relevance', limit = 20, page = 1 } = req.query;
    
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category parameter is required'
      });
    }
    
    // Use the search endpoint logic with a category filter
    req.query.q = ''; // Empty search term
    
    // Call the standard search function
    await exports.searchProducts(req, res, next);
  } catch (error) {
    console.error('Category filter error:', error);
    next(error);
  }
};

// Endpoint for "New Arrivals" (newest products)
exports.getNewArrivals = async (req, res, next) => {
  try {
    // Override the sort parameter to get newest products
    req.query.sort = 'newest';
    req.query.q = ''; // Empty search term
    
    // Call the standard search function
    await exports.searchProducts(req, res, next);
  } catch (error) {
    console.error('New arrivals error:', error);
    next(error);
  }
};

// Get search suggestions based on query
exports.getSearchSuggestions = async (req, res, next) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(200).json({ suggestions: [] });
    }
    
    // Query for products matching the search term
    const query = `
      {
        products(
          first: 20,
          query: "${q}"
        ) {
          edges {
            node {
              title
              productType
              tags
              options {
                name
                values
              }
            }
          }
        }
      }
    `;
    
    const result = await shopifyClient.query(query);
    
    // Extract suggestions from product titles, types, tags, and options
    const suggestionsSet = new Set();
    
    result.products?.edges?.forEach(({ node }) => {
      // Add product title if it contains the query
      if (node.title.toLowerCase().includes(q.toLowerCase())) {
        suggestionsSet.add(node.title);
      }
      
      // Add product type if it contains the query
      if (node.productType && node.productType.toLowerCase().includes(q.toLowerCase())) {
        suggestionsSet.add(node.productType);
      }
      
      // Add tags that contain the query
      if (node.tags) {
        node.tags.forEach(tag => {
          if (tag.toLowerCase().includes(q.toLowerCase())) {
            suggestionsSet.add(tag);
          }
        });
      }
      
      // Add option values that contain the query
      if (node.options) {
        node.options.forEach(option => {
          option.values.forEach(value => {
            if (value.toLowerCase().includes(q.toLowerCase())) {
              suggestionsSet.add(`${option.name}: ${value}`);
            }
          });
        });
      }
    });
    
    // Convert Set to Array and limit to 6 suggestions
    const suggestions = [...suggestionsSet].slice(0, 6);
    
    res.status(200).json({ suggestions });
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    res.status(200).json({ suggestions: [] });
  }
};

// Get trending searches
exports.getTrendingSearches = async (req, res, next) => {
  try {
    // This would typically come from analytics data or a database
    // For now, return common fashion search terms
    const trendingSearches = [
      "Dress",
      "Black",
      "Summer",
      "New",
      "Sale"
    ];
    
    res.status(200).json({ trendingSearches });
  } catch (error) {
    next(error);
  }
};

// Search products by tag - used for related products and collections
exports.searchProductsByTag = async (req, res, next) => {
  try {
    const { tag } = req.query;
    
    if (!tag) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tag parameter is required' 
      });
    }
    
    // Create GraphQL query
    const query = `
      {
        products(first: 20, query: "tag:${tag}") {
          edges {
            node {
              id
              title
              handle
              description
              images(first: 5) {
                edges {
                  node {
                    url
                  }
                }
              }
              variants(first: 1) {
                edges {
                  node {
                    price {
                      amount
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    
    // Execute the query
    const result = await shopifyClient.query(query);
    
    // Transform products for the frontend
    const products = result.products?.edges?.map(({ node }) => {
      const imageUrl = node.images.edges.length > 0 
        ? node.images.edges[0].node.url 
        : null;
      
      const price = node.variants.edges.length > 0 
        ? node.variants.edges[0].node.price.amount
        : "0.00";
      
      return {
        id: node.id.split('/').pop(),
        title: node.title,
        handle: node.handle,
        description: node.description,
        image: imageUrl,
        price: price
      };
    }) || [];
    
    res.status(200).json({
      success: true,
      products
    });
  } catch (error) {
    next(error);
  }
};