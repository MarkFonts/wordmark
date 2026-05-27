function a(s,e){self.postMessage(s,e??[])}let t=null;async function i(){a({type:"status",message:"Loading Python runtime..."});const{loadPyodide:s}=await import("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.mjs");t=await s({indexURL:"https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"}),a({type:"status",message:"Loading fontTools..."}),await t.loadPackage("fonttools"),a({type:"ready"})}self.onmessage=async s=>{const e=s.data;try{if(e.type==="loadFont"){const o=new Uint8Array(e.fontBytes);t.globals.set("_font_bytes_js",o);const n=await t.runPythonAsync(`
import io, json
from fontTools.ttLib import TTFont

_font_data = bytes(_font_bytes_js.to_py())
buf = io.BytesIO(_font_data)
_font_cache = TTFont(buf)

def _set_recal_names(font, family='ReCal Sans'):
    nt = font['name']
    ps = family.replace(' ', '')
    for nameID, value in [(1, family), (2, 'Regular'), (4, family), (6, ps), (16, family), (17, 'Regular')]:
        nt.setName(value, nameID, 3, 1, 0x0409)

axes_out = []
for axis in _font_cache['fvar'].axes:
    name = _font_cache['name'].getDebugName(axis.axisNameID) or axis.axisTag
    axes_out.append({
        'tag': axis.axisTag,
        'name': name,
        'min': float(axis.minValue),
        'default': float(axis.defaultValue),
        'max': float(axis.maxValue),
    })

json.dumps(axes_out)
`);a({type:"axisInfo",axisInfoJson:n})}else if(e.type==="previewFont"){t.globals.set("_thresholds_json",e.thresholdsJson);const n=(await t.runPythonAsync(`
import io, json
from fontTools.ttLib import TTFont

def _do_preview():
    ORIG = {
        'I': [5], 'l': [11], 'a': [14, 35], 'G': [41], 'g': [16],
        'f': [40], 'j': [40, 76], 't': [40, 76], 'y': [40, 61],
        'u': [60], 'C': [79], 'c': [79], 'M': [79]
    }
    thresh = json.loads(_thresholds_json)
    fnt = TTFont(io.BytesIO(_font_data))
    ga = next((a for a in fnt['fvar'].axes if a.axisTag == 'GEOM'), None)
    if not ga:
        out = io.BytesIO(); fnt.save(out); return out.getvalue()
    gi = next(i for i, a in enumerate(fnt['fvar'].axes) if a.axisTag == 'GEOM')
    gmin, gdef, gmax = ga.minValue, ga.defaultValue, ga.maxValue
    def u2n(v):
        v = min(max(float(v), gmin), gmax)
        d = (gdef - gmin) if v <= gdef else (gmax - gdef)
        return (v - gdef) / d if d else 0.0
    def n2u(n):
        return (gdef + n * (gdef - gmin)) if n <= 0 else (gdef + n * (gmax - gdef))
    def make_segs(bounds):
        if not bounds: return [(gmin, gmax)]
        return [(gmin, bounds[0])] + [(bounds[i], bounds[i+1]) for i in range(len(bounds)-1)] + [(bounds[-1], gmax)]
    def vsig(lo, hi, td):
        mid = (lo + hi) / 2
        return tuple(sorted((g, sum(1 for t in ts if mid >= t)) for g, ts in td.items()))
    nb = sorted(set(float(v) for ts in thresh.values() for v in ts))
    sig_map = {vsig(s[0], s[1], thresh): s for s in make_segs(nb)}
    fv = fnt.get('FeatureVariations')
    if fv:
        for rec in fv.FeatureVariationRecord:
            for cond in rec.ConditionSet.ConditionTable:
                if getattr(cond, 'AxisIndex', None) == gi:
                    lo = round(n2u(cond.FilterRangeMinValue), 2)
                    hi = round(n2u(cond.FilterRangeMaxValue), 2)
                    new_s = sig_map.get(vsig(lo, hi, ORIG))
                    if new_s:
                        cond.FilterRangeMinValue = u2n(new_s[0])
                        cond.FilterRangeMaxValue = u2n(new_s[1])
    out = io.BytesIO(); fnt.save(out); return out.getvalue()

_do_preview()
`)).toJs();a({type:"previewFontResult",ttf:n.buffer},[n.buffer])}else if(e.type==="measureWords"){t.globals.set("_mw_words_json",e.wordsJson),t.globals.set("_mw_geoms_json",e.geomValuesJson),t.globals.set("_mw_axis_defaults_json",e.axisDefaultsJson);const o=await t.runPythonAsync(`
import io, json
from fontTools.ttLib import TTFont

def _measure_words():
    words = json.loads(_mw_words_json)
    geom_values = json.loads(_mw_geoms_json)
    axis_defaults = json.loads(_mw_axis_defaults_json)
    fnt = TTFont(io.BytesIO(_font_data))

    cmap = fnt.getBestCmap() or {}
    upm = fnt['head'].unitsPerEm

    ga = next((a for a in fnt['fvar'].axes if a.axisTag == 'GEOM'), None)
    if not ga:
        return json.dumps({'upm': upm, 'widths': {}})
    gmin, gdef, gmax = ga.minValue, ga.defaultValue, ga.maxValue
    gi = next(i for i, a in enumerate(fnt['fvar'].axes) if a.axisTag == 'GEOM')

    def u2n(v):
        v = min(max(float(v), gmin), gmax)
        d = (gdef - gmin) if v <= gdef else (gmax - gdef)
        return (v - gdef) / d if d else 0.0

    # Build non-GEOM location from current user defaults for weight-accurate advances
    base_loc = {}
    for a in fnt['fvar'].axes:
        if a.axisTag == 'GEOM':
            continue
        val = float(axis_defaults.get(a.axisTag, a.defaultValue))
        base_loc[a.axisTag] = min(max(val, a.minValue), a.maxValue)

    # One glyphset at current weight/other axes — HVAR deltas applied by fontTools
    glyphset = fnt.getGlyphSet(location=base_loc, normalized=False)

    gsub = fnt.get('GSUB')
    fv = fnt.get('FeatureVariations')

    def get_subs(geom_norm):
        if not gsub or not fv:
            return {}
        subs = {}
        for rec in fv.FeatureVariationRecord:
            geom_conds = [c for c in rec.ConditionSet.ConditionTable if getattr(c, 'AxisIndex', None) == gi]
            if not geom_conds:
                continue
            if not all(c.FilterRangeMinValue <= geom_norm <= c.FilterRangeMaxValue for c in geom_conds):
                continue
            for sr in rec.FeatureTableSubstitution.SubstitutionRecord:
                for li in sr.Feature.LookupListIndex:
                    lk = gsub.table.LookupList.Lookup[li]
                    for sub in lk.SubTable:
                        if hasattr(sub, 'mapping'):
                            subs.update(sub.mapping)
        return subs

    def get_adv(glyph):
        try:
            return glyphset[glyph].width
        except Exception:
            return fnt['hmtx'].metrics.get(glyph, (0, 0))[0]

    def measure(word, subs):
        total = 0
        for ch in word:
            g = cmap.get(ord(ch))
            if g:
                total += get_adv(subs.get(g, g))
        return total

    widths = {}
    for geom in geom_values:
        norm = u2n(geom)
        subs = get_subs(norm)
        widths[str(geom)] = {w: measure(w, subs) for w in words}

    return json.dumps({'upm': upm, 'widths': widths})

_measure_words()
`);a({type:"measureWordsResult",dataJson:o})}else if(e.type==="applyConfig"){t.globals.set("_config_json",e.configJson);const n=(await t.runPythonAsync(`
import io, json, logging
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

logging.disable(logging.WARNING)

config = json.loads(_config_json)
new_defaults = config['axisDefaults']      # excludes opsz
opsz_m = float(config.get('opszMultiplier', 1))

buf = io.BytesIO(_font_data)
font = TTFont(buf)

# Shift non-opsz axis defaults via instancer
axis_limits = {}
for axis in font['fvar'].axes:
    tag = axis.axisTag
    if tag == 'opsz':
        continue  # handled separately below
    nd = float(new_defaults.get(tag, axis.defaultValue))
    nd = min(max(nd, axis.minValue), axis.maxValue)
    axis_limits[tag] = (axis.minValue, nd, axis.maxValue)

result = instantiateVariableFont(font, axis_limits, inplace=True) if axis_limits else font

# Scale opsz fvar axis and instance coordinates by 1/multiplier.
# Dividing all user-space values preserves normalized ratios (gvar untouched),
# so CSS opsz=8 with x3 shows the design that was originally at opsz=24.
if opsz_m != 1:
    for axis in result['fvar'].axes:
        if axis.axisTag == 'opsz':
            axis.minValue *= opsz_m
            axis.defaultValue *= opsz_m
            axis.maxValue *= opsz_m
    for instance in result['fvar'].instances:
        if 'opsz' in instance.coordinates:
            instance.coordinates['opsz'] *= opsz_m

_set_recal_names(result)
out = io.BytesIO()
result.save(out)
out.getvalue()
`)).toJs();a({type:"fontResult",ttf:n.buffer},[n.buffer])}}catch(o){a({type:"error",message:String(o)})}};i().catch(s=>{a({type:"error",message:`Worker init failed: ${s}`})});
