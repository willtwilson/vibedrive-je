import math, json, re

# Parse jersey-roads.js
with open('jersey-roads.js', 'r') as f:
    content = f.read()

# Extract the array portion
start = content.index('[')
end = content.rindex(']') + 1
arr_str = content[start:end]

# Convert JS object to JSON:
# 1. Protect escaped single quotes
arr_str = arr_str.replace("\\'", "\x00")
# 2. Replace single quotes with double quotes
arr_str = arr_str.replace("'", '"')
# 3. Restore escaped single quotes as literal apostrophe
arr_str = arr_str.replace('\x00', "'")
# 4. Quote unquoted keys: p, n, t, w, l
for key in ['p', 'n', 't', 'w', 'l']:
    arr_str = re.sub(r'(?<=[{,])' + key + r':', '"' + key + '":', arr_str)

roads = json.loads(arr_str)

print(f'Total roads: {len(roads)}')

# St Helier center
SH_X, SH_Z = 46, -65

# Collect all road endpoints within 30u of St Helier
MERGE_TOL = 2

def node_key(x, z):
    return (round(x / MERGE_TOL), round(z / MERGE_TOL))

# node_key -> {x, z, road_names: set, road_types: set, seg_count: int}
nodes = {}

for rd in roads:
    pts = rd['p']
    road_name = rd.get('n', '')
    road_type = rd.get('t', '')
    for i in range(len(pts)):
        x, z = pts[i][0], pts[i][1]
        dist = math.sqrt((x - SH_X)**2 + (z - SH_Z)**2)
        if dist > 30:
            continue
        k = node_key(x, z)
        found = None
        for dk_x in range(k[0]-1, k[0]+2):
            for dk_z in range(k[1]-1, k[1]+2):
                dk = (dk_x, dk_z)
                if dk in nodes:
                    nx, nz = nodes[dk]['x'], nodes[dk]['z']
                    if (nx-x)**2 + (nz-z)**2 < MERGE_TOL**2:
                        found = dk
                        break
            if found:
                break
        if found:
            nodes[found]['road_names'].add(road_name)
            nodes[found]['road_types'].add(road_type)
            nodes[found]['seg_count'] += 1
        else:
            nodes[k] = {'x': x, 'z': z, 'road_names': {road_name}, 'road_types': {road_type}, 'seg_count': 1}

# Find intersections: nodes with 2+ distinct road names
intersections = []
for k, n in nodes.items():
    names = {nm for nm in n['road_names'] if nm}
    if len(names) >= 2:
        dist = math.sqrt((n['x'] - SH_X)**2 + (n['z'] - SH_Z)**2)
        major_types = {'primary', 'secondary', 'trunk', 'tertiary'}
        major_count = len(n['road_types'] & major_types)
        intersections.append({
            'x': n['x'], 'z': n['z'],
            'names': sorted(names),
            'types': sorted(n['road_types']),
            'seg_count': n['seg_count'],
            'major_count': major_count,
            'dist': dist
        })

# Sort by: most major roads first, then most segments, then closest
intersections.sort(key=lambda i: (-i['major_count'], -i['seg_count'], i['dist']))

print(f'\nFound {len(intersections)} intersections with 2+ named roads within 30u of St Helier')
print('\nTop intersections (sorted by importance):')
for i, ix in enumerate(intersections[:20]):
    print(f'  {i+1}. ({ix["x"]:.1f}, {ix["z"]:.1f}) d={ix["dist"]:.1f} segs={ix["seg_count"]} major={ix["major_count"]} types={ix["types"]} roads={ix["names"][:4]}')

# Cluster: pick top intersections, skip any within 8u of already picked
picked = []
for ix in intersections:
    too_close = False
    for p in picked:
        if math.sqrt((ix['x']-p['x'])**2 + (ix['z']-p['z'])**2) < 8:
            too_close = True
            break
    if not too_close:
        picked.append(ix)
    if len(picked) >= 8:
        break

print(f'\nSelected {len(picked)} intersections (clustered, min 8u apart):')
for i, ix in enumerate(picked):
    print(f'  {i+1}. ({ix["x"]:.1f}, {ix["z"]:.1f}) d={ix["dist"]:.1f} segs={ix["seg_count"]} major={ix["major_count"]} roads={ix["names"][:4]}')

# Output as JS array for easy insertion
print('\nJS array:')
print('const trafficLightPositions = [')
for ix in picked:
    print(f'  {{x: {ix["x"]:.1f}, z: {ix["z"]:.1f}}},')
print('];')