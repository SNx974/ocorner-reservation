"use client";

import { X } from "lucide-react";

export function CgvModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}>
      <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-gray-900">Conditions Générales de Vente</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto p-6 text-sm text-gray-700 leading-relaxed space-y-4">
          <p className="font-bold text-gray-900">ELYT SAS appellation commerciale OCORNER</p>

          <Section title="LEXIQUE des termes contractuels">
            <p><strong>Client</strong> : désigne le consommateur personne physique ayant contracté avec la Société.</p>
            <p><strong>Commande</strong> : fait de souscrire aux Prestations proposées par la Société.</p>
            <p><strong>Conditions Générales de Vente (CGV)</strong> : désigne les conditions de vente déterminant les droits et obligations des Parties dans le cadre d’achats effectués sur le Site Internet exploité par la Société, ci-après “CGV”.</p>
            <p><strong>Contrat</strong> : désigne les conditions générales de ventes et les conditions particulières indiquées sur le Site Internet, que le Client déclare connaître et accepter sans réserve.</p>
            <p><strong>Établissement</strong> : désigne l’espace exploité OCORNER de la Société et situé au 5 Rue Du Stade De l’Est 97490 Sainte Clotilde.</p>
            <p><strong>Partie(s)</strong> : désigne(nt) la Société et/ou le Client.</p>
            <p><strong>Prestation(s)</strong> : désigne les prestations de services commercialisées par l’établissement OCORNER et visées notamment par l’article 2 des présentes.</p>
            <p><strong>Site Internet</strong> : désigne le site hébergé sous le nom de domaine suivant : https://www.ocorner.re/</p>
            <p><strong>Société</strong> : désigne la société ELYT SAS sous l’appellation commerciale OCORNER, société par actions simplifiée à associé unique (SAS) au capital social de 10 000€, immatriculée au registre du commerce et des sociétés de Saint Denis de la Réunion sous le numéro 898 912 589 dont le siège social est situé au 61 Rue Marthe Bacquet Cambaie 97460 Saint-Paul, prise en la personne de son représentant légal en exercice.</p>
          </Section>

          <Section title="ARTICLE 1 : IDENTIFICATION DES PARTIES">
            <p>Les présentes conditions générales de vente sont relatives aux Prestations proposées et commercialisées par la Société :</p>
            <p>ELYT, société par actions simplifiée au capital de 10 000 € dont le siège social est fixé 61 rue Marthe Bacquet 97460 SAINT-PAUL et immatriculée au registre du commerce et des sociétés de Saint-Denis sous le numéro 898912589.</p>
            <p>Les services sont exploités sous le nom commercial et la marque O CORNER.</p>
            <p>Les coordonnées sont les suivantes :<br/>adresse e-mail :<br/>numéro de téléphone :<br/>adresse postale :</p>
          </Section>

          <Section title="ARTICLE 2 : DÉFINITIONS">
            <p><strong>Client</strong> : désigne le consommateur personne physique ayant contracté avec la Société.</p>
            <p><strong>Commande</strong> : fait de souscrire aux Prestations proposées par la Société.</p>
            <p><strong>Conditions Générales de Vente (CGV)</strong> : désigne les conditions de vente déterminant les droits et obligations des Parties dans le cadre d’achats effectués sur le Site Internet exploité par la Société, ci-après “CGV”.</p>
            <p><strong>Contrat</strong> : désigne les conditions générales de ventes et les conditions particulières indiquées sur le Site Internet, que le Client déclare connaître et accepter sans réserve.</p>
            <p><strong>Établissement</strong> : désigne l’espace exploité OCORNER de la Société et situé au 5 Rue Du Stade De l’Est 97490 Sainte Clotilde.</p>
            <p><strong>Partie(s)</strong> : désigne(nt) la Société et/ou le Client.</p>
            <p><strong>Prestation(s)</strong> : désigne les Prestations de services commercialisées par l’établissement OCORNER et visées notamment par l’article 2 des présentes.</p>
            <p><strong>Site Internet</strong> : désigne le site hébergé sous le nom de domaine suivant : https://www.ocorner.re/</p>
            <p><strong>Société</strong> : désigne la société ELYT SAS sous l’appellation commerciale OCORNER, société par actions simplifiée à associé unique (SAS) au capital social de 10 000€, immatriculée au registre du commerce et des sociétés de Saint Denis de la Réunion sous le numéro 898 912 589 dont le siège social est situé au 61 Rue Marthe Bacquet Cambaie 97460 Saint-Paul, prise en la personne de son représentant légal en exercice.</p>
          </Section>

          <Section title="ARTICLE 3 : CHAMP D’APPLICATION">
            <p>Les présentes Conditions Générales de Vente constituent, conformément à l’article L. 441-1 du Code de commerce, le socle unique de la relation commerciale entre les parties.</p>
            <p>Elles ont pour objet de définir les conditions dans lesquelles la société ELYT fournit aux Clients les Prestations qu’elle commercialise.</p>
            <p>Elles s’appliquent, sans restriction ni réserve, à tous les Services fournis par le Prestataire auprès des Clients, quelles que soient les clauses pouvant figurer sur les documents du Client, et notamment ses conditions générales d’achat.</p>
            <p>Conformément à la règlementation en vigueur, ces Conditions Générales de Vente sont systématiquement communiquées à tout Client qui en fait la demande.</p>
            <p>Toute commande de Prestation implique, de la part du Client, l’acceptation des présentes Conditions Générales de Vente.</p>
            <p>Les renseignements figurant sur le catalogue, prospectus, site Internet ou tout autre support, et tarifs du Prestataire sont donnés à titre indicatif et sont révisables à tout moment. Le Prestataire est en droit d’y apporter toutes modifications qui lui paraîtront utiles.</p>
            <p>Le Client reconnaît avoir la capacité requise pour valablement s’engager et contracter avec la société ELYT.</p>
            <p>Le Client reconnaît que les enregistrements et sauvegardes réalisés sur le Site (les « Documents Électroniques ») auront pleine valeur probante entre le Client et le Vendeur. Ainsi, les Documents Électroniques, y compris leur date et heure, feront foi entre les parties à tout litige.</p>
            <p>Le Client reconnaît, par conséquent, dans ses relations contractuelles avec le Vendeur, la validité et la force probante des courriers électroniques.</p>
            <p>Sauf preuve contraire, les données enregistrées dans le système informatique du Vendeur constituent la preuve de l’ensemble des transactions conclues avec le Client.</p>
          </Section>

          <Section title="ARTICLE 4 : DÉFINITION DES PRESTATIONS">
            <p>Le Prestataire propose, dans le cadre de son établissement situé 5, Rue du stade de l’Est à Sainte Clotilde, différentes Prestations liées au sport et à l’activité physique ainsi qu’à la convivialité.</p>
            <p>Cet établissement regroupe plusieurs espaces par lesquels le Prestataire propose à la vente et à la réservation les Prestations suivantes :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>le football en salle à cinq : mise à disposition d’un terrain de football en salle pour 10 joueurs, par tranches d’une heure ;</li>
              <li>le parc marmaille : accès à une aire de jeux réservée aux enfants, pour la journée ;</li>
              <li>la restauration : réservation d’emplacement réservé à la consommation des plats servis par le restaurant ;</li>
              <li>l’accès dans le cadre d’événements aux différents espaces de l’établissement pour les particuliers, entreprises et comités d’entreprise. Ces événements peuvent être soit des événements directement planifiés par le Prestataire, soit des événements organisés à la demande du Client :
                <ul className="list-[circle] pl-5 mt-1 space-y-1">
                  <li>Les anniversaires permettent la réservation de places dans l’espace dédié, du nombre demandé de chaises par enfant (hors accompagnateurs) pour une durée de 3 heures, ainsi que la réservation de formules de restauration à consommer sur place ;</li>
                  <li>Les évènements organisés par ELYT, tels que karaoké, comic… ;</li>
                  <li>Les mercredis jeunesse sont des Prestations d’activités sportives et récréatives encadrées par un animateur, selon un planning communiqué régulièrement. L’accueil se fait de 7h à 17h30 ;</li>
                  <li>L’académie de foot est une Prestation régulière de pratique de football avec intervention d’une durée d’1h30 avec intervention d’un animateur.</li>
                </ul>
              </li>
            </ul>
          </Section>

          <Section title="ARTICLE 5 : HORAIRES D’OUVERTURE">
            <p>L’établissement est ouvert aux horaires suivants :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Du lundi au vendredi de 9h à 23h ;</li>
              <li>Le samedi de 9h à 21h ;</li>
              <li>Le dimanche de 9h à 20h00.</li>
            </ul>
            <p>L’établissement se réserve le droit de fermer pendant des périodes de congé ou tout autre motif (réparations, entretien du local, maladie, etc.). Ces fermetures seront indiquées sur le site comme créneaux fermés à travers le calendrier de réservation.</p>
          </Section>

          <Section title="ARTICLE 6 : CONDITIONS DE RÉSERVATION DES PRESTATIONS">
            <p className="font-semibold">Article 6.1 : conclusion du contrat en ligne</p>
            <p>Le Client reconnaît qu’il a bénéficié des conseils et informations nécessaires sur le Site Internet afin de s’assurer de l’adéquation de l’offre à ses besoins. Le Client déclare être en mesure de contracter légalement en vertu des lois françaises.</p>
            <p>Avant toute commande, le Client devra créer un espace client en ligne sur le site du prestataire, destiné à permettre l’enregistrement, le suivi et la gestion des commandes. Pour ce faire, il accepte que soient traitées ses données personnelles, à savoir nom, prénoms, adresse, numéro de téléphone et adresse courriel.</p>
            <p>A chaque étape de la Commande, le Client peut à tout moment vérifier le contenu de sa Commande et avoir accès à l’ensemble des informations relatives aux Prestations sélectionnées, à leur tarif, aux conditions de livraison, aux conditions et moyens de paiement, et à sa possibilité de se rétracter de sa commande.</p>
            <p>Le Client devra suivre les étapes suivantes pour conclure définitivement sa Commande :</p>
            <p><strong>Étape 1</strong> : choix de la Prestation par le Client après visualisation de ses caractéristiques.</p>
            <p><strong>Étape 2</strong> : en cliquant sur l’onglet « JE RESERVE », le Client accède au formulaire de sélection des terrains, des dates et horaires possibles de sa réservation de terrain de foot à 5. Après sélection, des informations relatives à des données personnelles sont nécessaires au traitement de la Commande, à savoir le nom, le prénom, l’adresse e-mail et le numéro de téléphone. Une fois les données entrées, le Client accède à la page récapitulative de sa future Commande.</p>
            <p><strong>Étape 3</strong> : en cliquant sur l’onglet « Réserver » le Client accède au formulaire de paiement s’il souhaite finaliser sa commande.</p>
            <p><strong>Étape 4</strong> : en cliquant sur l’onglet « Commander » le Client donne l’ordre irrévocable de paiement. Aucune modification ne pourra plus avoir lieu. La Société envoie au Client un mail récapitulatif de la Commande et de la confirmation du paiement.</p>
            <p className="font-semibold">Article 6.2 : Conditions particulières pour certaines Prestations</p>
            <p>Pour le football en salle à cinq : le Client doit choisir s’il souhaite que la partie soit filmée ou non, et donne lieu à l’établissement de statistiques ou non. Pour toute réservation effectuée en soirée (entre 18h et 23h), la réservation ne sera définitivement validée que si 10 réservations sont effectuées pour le créneau horaire demandé. Le Client peut effectuer autant de réservations par tranches d’une heure qu’il le souhaite, dans la limite des disponibilités. Si le nombre de 10 réservations n’est pas atteint, le Prestataire se réserve le droit d’annuler la commande ; la réservation sera reportée ou exceptionnellement remboursée sur demande expresse. La commande peut se faire jusqu’au moment de l’exécution de la Prestation, dans la limite des disponibilités ; si le créneau a déjà débuté, aucune réduction tarifaire ne sera accordée.</p>
            <p>Pour le marmaille parc : la commande peut se faire jusqu’au jour même, selon la capacité d’accueil du parc qui est de 120 enfants.</p>
            <p>Pour la réservation de tables : les tables peuvent être réservées dans le cadre des anniversaires pour l’espace dédié, ou de manière individuelle dans la limite des places disponibles. La réservation porte sur la possibilité d’accéder à une table et non la garantie d’une table en particulier (« premier arrivé premier servi »).</p>
            <p>Pour la réservation d’évènements : pour les anniversaires, le Client organisateur devra réserver pour l’ensemble des participants et indiquer les formules de restauration souhaitées (jusqu’à 24 heures avant la date). Pour les animations (karaoké…), le Client réserve une place pour la durée de l’animation. Pour l’accueil collectif de mineurs, la réservation n’est définitive qu’après transmission d’une fiche de renseignements et d’une fiche sanitaire remplies. Toute demande d’organisation d’évènement particulier fait l’objet d’un devis.</p>
            <p className="font-semibold">Article 6.3 : Confirmation de la commande</p>
            <p>La Commande devient définitive à l’issue de l’étape 4. Le Client recevra par e-mail un accusé de réception confirmant la commande, et une confirmation du paiement.</p>
          </Section>

          <Section title="ARTICLE 7 : DROIT DE RÉTRACTATION ET ANNULATION">
            <p>Conformément à l’article L. 121-20-4 du Code de la consommation, le droit de rétractation est exclu s’agissant de Prestations de loisirs devant être fournies à une date ou selon une périodicité déterminée.</p>
            <p>Les annulations sont possibles sans frais ni pénalités dans les conditions suivantes :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>football en salle à cinq : jusqu’à 48 heures avant le début de la Prestation ;</li>
              <li>marmaille parc : jusqu’à 24 heures avant ;</li>
              <li>tables de restauration : jusqu’à 48 heures avant ;</li>
              <li>anniversaires : jusqu’à 48 heures avant ;</li>
              <li>autres évènements : jusqu’à 48 heures avant.</li>
            </ul>
            <p>En dehors de ces conditions, toute commande non honorée ne donnera lieu à aucun remboursement, avoir ou report et sera définitivement perdue.</p>
          </Section>

          <Section title="ARTICLE 8 : CONDITIONS TARIFAIRES ET PAIEMENT">
            <p>Le paiement est exigible immédiatement à la Commande, par carte bancaire. Le Client peut régler par carte émise par une banque française ; les cartes émises hors de France doivent être des cartes bancaires internationales. Le paiement sécurisé en ligne est réalisé par un Prestataire de paiement de la Société.</p>
            <p>Une fois le paiement lancé, la transaction est immédiatement débitée après vérification des informations. L’engagement de payer par carte est irrévocable. Le Client confirme être le titulaire légal de la carte et en droit d’en faire usage. En cas d’erreur ou d’impossibilité de valider le paiement, la vente est résolue de plein droit et la Commande annulée.</p>
            <p>Les tarifs s’entendent toutes taxes comprises, tenant compte de la TVA applicable au jour de l’inscription ; tout changement du taux de TVA pourra être répercuté sur le prix des services.</p>
          </Section>

          <Section title="ARTICLE 9 : OBLIGATIONS DES PARTIES – RESPONSABILITÉS">
            <p className="font-semibold">Article 9.1 : Obligations et responsabilité de ELYT</p>
            <p>ELYT fournit l’accès aux équipements sélectionnés par le Client. Football à cinq : accès au terrain, ballon et chasubles ; le Client se munit de ses vêtements et chaussures de sport (mise à disposition contre remise en garantie d’un effet personnel). ELYT ne garantit pas la composition des équipes ni le nombre de joueurs en cas de désistement. Marmaille parc : accès sous l’entière surveillance et responsabilité des parents. Restauration : mise à disposition des tables ; la liste des allergènes est disponible. Évènements : mise à disposition des équipements et de l’animation retenue. ELYT décline toute responsabilité en cas de dommage survenant à l’occasion de l’utilisation des équipements.</p>
            <p className="font-semibold">Article 9.2 : Obligations et responsabilité du Client</p>
            <p>Le Client s’engage à honorer les commandes ; les paiements doivent être à jour pour accéder au lieu. En cas de non-présentation, la commande est perdue et le paiement reste acquis à ELYT. Le Client fait usage des équipements conformément aux règles de jeu, de sécurité et d’hygiène ; tout usage inadapté ou dangereux peut entraîner l’exclusion sans remboursement. Le Client laisse les lieux en bon état et est responsable de toute dégradation. Il déclare être suffisamment assuré et seul responsable de son aptitude physique. Pour les évènements impliquant des mineurs, l’organisateur assure seul la surveillance des enfants et recueille les autorisations parentales. La consommation d’alcool n’est possible que dans le cadre d’une commande d’un repas.</p>
          </Section>

          <Section title="ARTICLE 10 : FORCE MAJEURE OU MODIFICATION UNILATÉRALE DU PLANNING">
            <p className="font-semibold">Article 10.1 : Cas de Force Majeure</p>
            <p>Chacune des Parties sera exonérée de toute responsabilité en cas de manquement causé par un cas de Force majeure, défini comme un événement insurmontable et irrésistible, extérieur à la maîtrise des parties (phénomènes naturels, pandémie, faits militaires, politiques ou diplomatiques, etc.). La Partie concernée notifie promptement l’autre par lettre recommandée avec avis de réception. Les obligations sont alors suspendues pour la durée et l’étendue des circonstances de Force majeure. Les Parties s’efforcent de bonne foi de poursuivre l’exécution des Prestations.</p>
            <p className="font-semibold">Article 10.2 : Modification unilatérale du planning</p>
            <p>La Société peut, pour des raisons organisationnelles, de sécurité ou de gestion des Clients, modifier ou ajouter des Prestations ou horaires dans le planning, sans que cela ne puisse entraîner des réclamations ou demandes de remboursements.</p>
          </Section>

          <Section title="ARTICLE 11 : DROIT À L’IMAGE">
            <p>Le Prestataire propose certaines Prestations avec l’option de prise de vues (film ou photographies). Les captations pourront être diffusées sur le Site et réseaux sociaux de ELYT. En réservant une Prestation avec ces options, le Client consent à l’exploitation de son image. L’acceptation des CGV vaut acceptation expresse de l’utilisation de son image. Lorsque le Client réserve pour des tiers, il s’engage à attirer leur attention sur ces règles. Autorisation valable 10 ans, sur le monde entier, sur tous supports matériels et immatériels connus ou inconnus à ce jour.</p>
          </Section>

          <Section title="ARTICLE 12 : TRAITEMENT DES DONNÉES ET CONFORMITÉ AU RGPD">
            <p>Le Client et la Société s’engagent sur l’honneur à fournir des informations exactes. En application de la loi Informatique et Libertés du 6 janvier 1978 et du RGPD du 27 avril 2016, la Société met en place les moyens nécessaires à la sécurisation du traitement et au consentement du Client. La Société collecte et utilise les données suivantes : pour le Client (nom, prénom, adresse email, téléphone) ; pour l’enfant (prénom et tranche d’âge). La Société tient un registre de traitement et désigne un délégué à la protection des données. Aucun transfert de données n’est réalisé en dehors de ce qui est nécessaire à l’exécution du Contrat. Le Client peut accéder, rectifier ou supprimer ses données par demande écrite à : contact@ocorner.re</p>
          </Section>

          <Section title="ARTICLE 13 : LOI APPLICABLE">
            <p>Le Contrat est régi par la loi française.</p>
          </Section>

          <Section title="ARTICLE 14 : CONTESTATIONS ET COMPÉTENCE EN CAS DE LITIGE">
            <p>Le Client peut présenter toute réclamation en contactant la Société par e-mail à : contact@ocorner.re. Il peut utiliser la plateforme : https://webgate.ec.europa.eu/odr/main/index.cfm?event=main.home.show&lng=FR. À défaut d’accord, le litige sera porté devant le Tribunal judiciaire de Saint Denis de la Réunion.</p>
          </Section>
        </div>
        <div className="p-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
      {children}
    </div>
  );
}
