/**
 * Parse OVHcloud design tokens and convert to Tailwind CSS format
 */
const tokens = require('../design-tokens.json');

function extractColorValue(colorObj) {
  if (colorObj?.$value?.hex) {
    return colorObj.$value.hex;
  }
  return null;
}

function extractDimensionValue(dimObj) {
  if (dimObj?.$value?.value !== undefined) {
    return `${dimObj.$value.value}${dimObj.$value.unit || 'px'}`;
  }
  return null;
}

function extractShadowValue(shadowObj) {
  if (shadowObj?.$value) {
    const v = shadowObj.$value;
    const offsetX = v.offsetX?.value || 0;
    const offsetY = v.offsetY?.value || 0;
    const blur = v.blur?.value || 0;
    const spread = v.spread?.value || 0;
    const color = v.color?.hex || '#000000';
    const opacity = v.color?.components?.[3] !== undefined ? v.color.components[3] : 1;
    
    // Convert rgba if opacity is not 1
    if (opacity < 1) {
      const r = Math.round(v.color.components[0] * 255);
      const g = Math.round(v.color.components[1] * 255);
      const b = Math.round(v.color.components[2] * 255);
      return `${offsetX}px ${offsetY}px ${blur}px ${spread}px rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    
    return `${offsetX}px ${offsetY}px ${blur}px ${spread}px ${color}`;
  }
  return null;
}

function parseDesignTokens() {
  const colors = {};
  const spacing = {};
  const borderRadius = {};
  const boxShadow = {};
  const fontFamily = {};
  const fontSize = {};
  const fontWeight = {};

  // Parse colors
  if (tokens.color) {
    // Semantic colors
    if (tokens.color.semantic) {
      Object.keys(tokens.color.semantic).forEach(key => {
        const value = extractColorValue(tokens.color.semantic[key]);
        if (value) {
          colors[key] = value;
        }
      });
    }

    // Palette colors
    if (tokens.color.palette) {
      Object.keys(tokens.color.palette).forEach(key => {
        const value = extractColorValue(tokens.color.palette[key]);
        if (value) {
          colors[key.replace('palette-', 'palette')] = value;
        }
      });
    }

    // Border colors
    if (tokens.border?.color) {
      Object.keys(tokens.border.color).forEach(key => {
        const value = extractColorValue(tokens.border.color[key]);
        if (value) {
          colors[key.replace('border-color-', 'border')] = value;
        }
      });
    }
  }

  // Parse spacing
  if (tokens.spacing) {
    Object.keys(tokens.spacing).forEach(key => {
      const value = extractDimensionValue(tokens.spacing[key]);
      if (value) {
        const num = key.replace('spacing-', '');
        spacing[num] = value;
      }
    });
  }

  // Parse border radius
  if (tokens.radius) {
    Object.keys(tokens.radius).forEach(key => {
      const value = extractDimensionValue(tokens.radius[key]);
      if (value) {
        const num = key.replace('radius-', '');
        borderRadius[num] = value;
      }
    });
  }

  // Parse shadows
  if (tokens.shadow) {
    Object.keys(tokens.shadow).forEach(key => {
      const value = extractShadowValue(tokens.shadow[key]);
      if (value) {
        const num = key.replace('shadow-', '');
        boxShadow[num] = value;
      }
    });
  }

  // Parse typography
  if (tokens.typography) {
    if (tokens.typography['font-family']) {
      Object.keys(tokens.typography['font-family']).forEach(key => {
        const fontObj = tokens.typography['font-family'][key];
        if (fontObj?.$value) {
          if (Array.isArray(fontObj.$value)) {
            fontFamily[key] = fontObj.$value.map(f => `"${f}"`).join(', ');
          } else if (typeof fontObj.$value === 'string') {
            fontFamily[key] = fontObj.$value;
          }
        }
      });
    }

    if (tokens.typography.style) {
      Object.keys(tokens.typography.style).forEach(key => {
        const styleObj = tokens.typography.style[key];
        if (styleObj?.$value) {
          // Font size
          if (styleObj.$value['font-size']) {
            const fs = extractDimensionValue({ $value: styleObj.$value['font-size'] });
            if (fs) {
              fontSize[key] = fs;
            }
          }
          // Font weight
          if (styleObj.$value['font-weight']) {
            fontWeight[key] = styleObj.$value['font-weight'];
          }
        }
      });
    }
  }

  return {
    colors,
    spacing,
    borderRadius,
    boxShadow,
    fontFamily,
    fontSize,
    fontWeight,
  };
}

module.exports = parseDesignTokens();
