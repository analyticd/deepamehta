package de.deepamehta.topicmaps;

import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONObject;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.logging.Logger;



public class ClusterCoords implements Iterable<ClusterCoords.Entry> {

    // ---------------------------------------------------------------------------------------------- Instance Variables

    private List<Entry> entries = new ArrayList();

    private Logger logger = Logger.getLogger(getClass().getName());

    // ---------------------------------------------------------------------------------------------------- Constructors

    public ClusterCoords(JSONArray entries) {
        try {
            for (int i = 0; i < entries.length(); i++) {
                JSONObject entry = entries.getJSONObject(i);
                this.entries.add(new Entry(
                    entry.getLong("topicId"),
                    entry.getInt("x"),
                    entry.getInt("y")
                ));
            }
        } catch (Exception e) {
            throw new RuntimeException("Parsing ClusterCoords failed (JSONArray=" + entries + ")", e);
        }
    }

    // -------------------------------------------------------------------------------------------------- Public Methods

    @Override
    public Iterator<Entry> iterator() {
        return entries.iterator();
    }

    public class Entry {

        public long topicId;
        public int x;
        public int y;

        private Entry(long topicId, int x, int y) {
            this.topicId = topicId;
            this.x = x;
            this.y = y;
        }
    }
}
