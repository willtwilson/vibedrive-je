#!/usr/bin/env python3
"""Process OSM roads JSON into compact jersey-roads.js for the Three.js game."""
import json, math, sys

# Coordinate mapping (from the game)
LNG_CENTER = -2.1976
LAT_CENTER = 49.1654
SCALE_X = 496.0   # units per degree longitude
SCALE_Z = 747.8   # units per degree latitude
Z_OFFSET = -50

# Driveable highway types
DRIVEABLE = {'primary', 'secondary', 'tertiary', 'trunk', 'residential', 'unclassified',
             'primary_link', 'secondary_link', 'tertiary_link', 'trunk_link', 'living_street'}

# Road widths by type
WIDTHS = {
    'trunk': 8, 'trunk_link': 6,
    'primary': 8, 'primary_link': 6,
    'secondary': 6, 'secondary_link': 5,
    'tertiary': 5, 'tertiary_link': 4,
    'residential': 4, 'unclassified': 4,
    'living_street': 4,
}

# Lane counts by type
LANES = {
    'trunk': 2, 'primary': 2, 'secondary': 2,
    'tertiary': 1, 'residential': 1, 'unclassified': 1,
    'living_street': 1,
}

def latlon_to_xz(lat, lon):
    x = (lon - LNG_CENTER) * SCALE_X
    z = (LAT_CENTER - lat) * SCALE_Z + Z_OFFSET  # invert lat: higher lat = more negative z
    return round(x, 2), round(z, 2)

def douglas_peucker(points, epsilon=0.3):
    """Simplify a polyline using Douglas-Peucker. Points: [(x,z), ...]"""
    if len(points) < 3:
        return points
    
    def perp_dist(pt, a, b):
        dx, dz = b[0] - a[0], b[1] - a[1]
        if dx == 0 and dz == 0:
            return math.sqrt((pt[0]-a[0])**2 + (pt[1]-a[1])**2)
        t = ((pt[0]-a[0])*dx + (pt[1]-a[1])*dz) / (dx*dx + dz*dz)
        proj_x = a[0] + t * dx
        proj_z = a[1] + t * dz
        return math.sqrt((pt[0]-proj_x)**2 + (pt[1]-proj_z)**2)
    
    def dp(pts, eps):
        if len(pts) < 3:
            return pts
        dmax, idx = 0, 0
        for i in range(1, len(pts)-1):
            d = perp_dist(pts[i], pts[0], pts[-1])
            if d > dmax:
                dmax, idx = d, i
        if dmax > eps:
            left = dp(pts[:idx+1], eps)
            right = dp(pts[idx:], eps)
            return left[:-1] + right
        else:
            return [pts[0], pts[-1]]
    
    return dp(points, epsilon)

def main():
    with open('research/osm-roads.json') as f:
        data = json.load(f)
    
    roads = []
    road_count = 0
    total_points = 0
    skipped = 0
    
    for el in data['elements']:
        if el.get('type') != 'way':
            continue
        tags = el.get('tags', {})
        hw = tags.get('highway', '')
        if hw not in DRIVEABLE:
            skipped += 1
            continue
        
        geom = el.get('geometry', [])
        if len(geom) < 2:
            skipped += 1
            continue
        
        # Convert to game coords
        points = [latlon_to_xz(p['lat'], p['lon']) for p in geom]
        
        # Simplify with Douglas-Peucker
        points = douglas_peucker(points, epsilon=0.3)
        
        if len(points) < 2:
            skipped += 1
            continue
        
        # Get road name
        name = tags.get('name', tags.get('ref', ''))
        
        # Normalize type for width lookup
        rtype = hw
        if rtype not in WIDTHS:
            rtype = 'residential'  # fallback
        
        width = WIDTHS.get(rtype, 4)
        lanes = LANES.get(rtype, 1)
        
        roads.append({
            'points': points,
            'name': name,
            'type': hw,
            'width': width,
            'lanes': lanes,
        })
        road_count += 1
        total_points += len(points)
    
    # Write as compact JS
    with open('jersey-roads.js', 'w') as f:
        f.write('// Auto-generated from OSM data — ')
        f.write(f'{road_count} roads, {total_points} points\n')
        f.write('var jerseyRoads = [\n')
        for r in roads:
            pts_str = ','.join(f'[{p[0]},{p[1]}]' for p in r['points'])
            name_escaped = r['name'].replace("'", "\\'").replace('"', '\\"')
            f.write(f"{{p:[{pts_str}],n:'{name_escaped}',t:'{r['type']}',w:{r['width']},l:{r['lanes']}}},\n")
        f.write('];\n')
    
    print(f'Processed {road_count} roads ({total_points} points), skipped {skipped}')
    print(f'Output: jersey-roads.js')
    
    # Check file size
    import os
    sz = os.path.getsize('jersey-roads.js')
    print(f'File size: {sz/1024:.1f} KB')

if __name__ == '__main__':
    main()