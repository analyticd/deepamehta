package de.deepamehta.core.impl;

import de.deepamehta.core.Association;
import de.deepamehta.core.RelatedAssociation;
import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import de.deepamehta.core.model.TopicModel;

import java.util.List;
import java.util.logging.Logger;



/**
 * A topic that is attached to the {@link CoreService}.
 */
class TopicImpl extends DeepaMehtaObjectImpl implements Topic {

    // ---------------------------------------------------------------------------------------------- Instance Variables

    private final Logger logger = Logger.getLogger(getClass().getName());

    // ---------------------------------------------------------------------------------------------------- Constructors

    TopicImpl(TopicModelImpl model, PersistenceLayer pl) {
        super(model, pl);
    }

    // -------------------------------------------------------------------------------------------------- Public Methods



    // ****************************
    // *** Topic Implementation ***
    // ****************************



    @Override
    public final void update(TopicModel updateModel) {
        pl.updateTopic(getModel(), (TopicModelImpl) updateModel);
    }

    @Override
    public final void delete() {
        pl.deleteTopic(getModel());
    }

    // ---

    @Override
    public final Topic findChildTopic(String topicTypeUri) {
        TopicModelImpl topic = getModel().findChildTopic(topicTypeUri);
        return topic != null ? topic.instantiate() : null;
    }

    // ---

    @Override
    public final Topic loadChildTopics() {
        model.loadChildTopics();
        return this;
    }

    @Override
    public final Topic loadChildTopics(String assocDefUri) {
        model.loadChildTopics(assocDefUri);
        return this;
    }

    // ---

    // Note: overridden by DeepaMehtaTypeImpl
    @Override
    public TopicModelImpl getModel() {
        return (TopicModelImpl) model;
    }



    // ***************************************
    // *** DeepaMehtaObject Implementation ***
    // ***************************************



    // === Traversal ===

    // ### TODO: consider adding model convenience, would require model renamings (get -> fetch)

    // --- Topic Retrieval ---

    @Override
    public final List<RelatedTopic> getRelatedTopics(List assocTypeUris, String myRoleTypeUri,
                                                     String othersRoleTypeUri, String othersTopicTypeUri) {
        return pl.instantiate(pl.getTopicRelatedTopics(getId(), assocTypeUris, myRoleTypeUri, othersRoleTypeUri,
            othersTopicTypeUri));
    }

    // --- Association Retrieval ---

    @Override
    public final RelatedAssociation getRelatedAssociation(String assocTypeUri, String myRoleTypeUri,
                                                          String othersRoleTypeUri, String othersAssocTypeUri) {
        RelatedAssociationModelImpl assoc = pl.getTopicRelatedAssociation(getId(), assocTypeUri, myRoleTypeUri,
            othersRoleTypeUri, othersAssocTypeUri);
        return assoc != null ? assoc.instantiate() : null;
    }

    @Override
    public final List<RelatedAssociation> getRelatedAssociations(String assocTypeUri, String myRoleTypeUri,
                                                                 String othersRoleTypeUri, String othersAssocTypeUri) {
        return pl.instantiate(pl.getTopicRelatedAssociations(getId(), assocTypeUri, myRoleTypeUri, othersRoleTypeUri,
            othersAssocTypeUri));
    }

    // ---

    @Override
    public final Association getAssociation(String assocTypeUri, String myRoleTypeUri, String othersRoleTypeUri,
                                                                                       long othersTopicId) {
        return pl.getAssociation(assocTypeUri, getId(), othersTopicId, myRoleTypeUri, othersRoleTypeUri);
    }

    @Override
    public final List<Association> getAssociations() {
        return pl.instantiate(pl.getTopicAssociations(getId()));
    }
}
