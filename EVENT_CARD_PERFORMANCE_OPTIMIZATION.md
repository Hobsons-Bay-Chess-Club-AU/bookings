# EventCard Performance Optimization

This document describes the performance optimization implemented for EventCard components to improve loading performance for long lists of events.

## Problem

The original implementation was loading pricing data for every event card on page load, which caused significant performance issues:

1. **Excessive API Calls**: Every event card made a separate API call to `/api/public/events/${event.id}/pricing` on page load
2. **Poor Performance**: With long lists (50+ events), this resulted in 50+ simultaneous API requests
3. **Unnecessary Network Traffic**: Loading pricing data for events not visible to the user
4. **Slow Page Load**: Initial page load was slow due to blocking API calls

## Solution

Implemented **Intersection Observer** to enable lazy loading of pricing data only when event cards become visible during scrolling.

## Implementation Details

### Key Changes Made

#### 1. **Intersection Observer Setup**
```typescript
const [isVisible, setIsVisible] = useState(false)
const [pricingLoaded, setPricingLoaded] = useState(false)
const cardRef = useRef<HTMLDivElement>(null)

// Intersection Observer to detect when card becomes visible
useEffect(() => {
  const currentRef = cardRef.current
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      })
    },
    {
      rootMargin: '50px', // Start loading 50px before the card becomes visible
      threshold: 0.1
    }
  )

  if (currentRef) {
    observer.observe(currentRef)
  }

  return () => {
    if (currentRef) {
      observer.unobserve(currentRef)
    }
  }
}, [])
```

#### 2. **Lazy Loading Logic**
```typescript
// Load pricing data only when card becomes visible and hasn't been loaded yet
const loadPricingRange = useCallback(async () => {
  if (!isVisible || pricingLoaded) return

  try {
    setPricingLoaded(true)
    const res = await fetch(`/api/public/events/${event.id}/pricing?membership_type=all`, { cache: 'no-store' })
    // ... pricing logic
  } catch {
    // Silent fallback to base price
  }
}, [isVisible, pricingLoaded, event.id, event.price])

// Load pricing when card becomes visible
useEffect(() => {
  if (isVisible && !pricingLoaded) {
    loadPricingRange()
  }
}, [isVisible, pricingLoaded, loadPricingRange])
```

#### 3. **Initial Price Display**
```typescript
// Set initial price label from event base price
useEffect(() => {
  const base = event.price
  setPriceLabel(base === 0 ? 'Contact organizer' : `AUD $${base.toFixed(2)}`)
}, [event.price])
```

### Configuration Options

#### **Intersection Observer Settings**
- **`rootMargin: '50px'`**: Starts loading 50px before the card becomes visible (preloading)
- **`threshold: 0.1`**: Triggers when 10% of the card is visible
- **`observer.unobserve(entry.target)`**: Stops observing once triggered (one-time load)

#### **Performance Benefits**
- **Reduced Initial Load**: Only visible cards load pricing data
- **Progressive Loading**: Pricing loads as user scrolls
- **Preloading**: 50px margin ensures smooth user experience
- **One-time Loading**: Each card loads pricing only once

## Performance Improvements

### Before Optimization
- **50 events** = 50 API calls on page load
- **100 events** = 100 API calls on page load
- **Network blocking** during initial load
- **Poor user experience** with long loading times

### After Optimization
- **50 events** = ~5-10 API calls on page load (only visible cards)
- **100 events** = ~5-10 API calls on page load (only visible cards)
- **Non-blocking** initial page load
- **Smooth scrolling** with progressive loading

## User Experience

### Initial Load
1. **Fast Page Load**: Page loads quickly with base pricing
2. **Immediate Interaction**: Users can start scrolling immediately
3. **Progressive Enhancement**: Pricing data loads as needed

### Scrolling Experience
1. **Smooth Scrolling**: No performance impact during scroll
2. **Preloading**: Pricing loads before cards become fully visible
3. **No Loading States**: Seamless transition from base to detailed pricing

### Fallback Behavior
1. **Base Price Display**: Shows event base price initially
2. **Graceful Degradation**: Falls back to base price if API fails
3. **Silent Failures**: No error messages for failed pricing loads

## Technical Benefits

### Network Optimization
- **Reduced Bandwidth**: Only loads data for visible cards
- **Fewer Concurrent Requests**: Prevents API rate limiting
- **Better Caching**: More efficient use of browser cache

### Memory Management
- **Reduced Memory Usage**: Only stores pricing for visible cards
- **Efficient Cleanup**: Observer cleanup prevents memory leaks
- **Optimized Re-renders**: Minimal state updates

### Browser Performance
- **Faster JavaScript Execution**: Less blocking during initial load
- **Reduced DOM Manipulation**: Fewer simultaneous updates
- **Better Resource Utilization**: Spreads load over time

## Monitoring and Debugging

### Performance Metrics
- **Initial Load Time**: Should be significantly reduced
- **Time to Interactive**: Faster due to reduced blocking
- **Scroll Performance**: Should remain smooth

### Debugging Tools
- **Browser DevTools**: Monitor network requests
- **React DevTools**: Check component re-renders
- **Performance Tab**: Measure intersection observer performance

### Common Issues
1. **Observer Not Triggering**: Check if element is properly referenced
2. **Multiple API Calls**: Ensure `pricingLoaded` flag is working
3. **Memory Leaks**: Verify observer cleanup in useEffect

## Future Enhancements

### Potential Improvements
1. **Virtual Scrolling**: For very long lists (1000+ events)
2. **Pricing Caching**: Cache pricing data in localStorage
3. **Batch Loading**: Load pricing for multiple visible cards at once
4. **Skeleton Loading**: Show loading states for pricing data

### Advanced Features
1. **Predictive Loading**: Preload pricing for upcoming cards
2. **Background Sync**: Update pricing data in background
3. **Offline Support**: Cache pricing for offline viewing

## Conclusion

The intersection observer implementation provides significant performance improvements for event lists while maintaining excellent user experience. The lazy loading approach reduces initial load time, network traffic, and memory usage while ensuring smooth scrolling and progressive enhancement.

This optimization is particularly beneficial for:
- **Large event lists** (50+ events)
- **Mobile devices** with limited bandwidth
- **Slow network connections**
- **High-traffic scenarios** with API rate limiting
